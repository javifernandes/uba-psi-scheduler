#!/usr/bin/env node

import './load-env';

type Command = 'stats' | 'reset';

type CliOptions = {
  command: Command;
  endpoint: string;
  token: string;
  confirm: string;
  batchSize: number;
};

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const command = (args[0] || '').trim() as Command;
  const byName = (name: string) => {
    const idx = args.findIndex((arg) => arg === name);
    return idx >= 0 ? args[idx + 1] || '' : '';
  };

  if (command !== 'stats' && command !== 'reset') {
    throw new Error(
      'Uso: npm run convex:admin -- <stats|reset> [--endpoint ...] [--token ...] [--batch-size ...]'
    );
  }

  const endpoint = byName('--endpoint') || process.env.CONVEX_INGEST_URL || '';
  const token =
    byName('--token') || process.env.CONVEX_ADMIN_TOKEN || process.env.VACANCY_INGEST_TOKEN || '';
  const confirm = byName('--confirm') || '';
  const batchSizeRaw = Number.parseInt(byName('--batch-size') || '200', 10);

  if (!endpoint) {
    throw new Error('Falta endpoint. Usá --endpoint o CONVEX_INGEST_URL.');
  }
  if (!token) {
    throw new Error('Falta token. Usá --token o CONVEX_ADMIN_TOKEN/VACANCY_INGEST_TOKEN.');
  }

  return {
    command,
    endpoint,
    token,
    confirm,
    batchSize: Number.isFinite(batchSizeRaw) && batchSizeRaw > 0 ? batchSizeRaw : 200,
  };
};

const withPath = (endpoint: string, path: string) => `${endpoint.replace(/\/$/, '')}${path}`;

const postJson = async (url: string, token: string, body: unknown) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}: ${payload}`);
  }
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
};

const main = async () => {
  const options = parseArgs();
  if (options.command === 'stats') {
    const result = await postJson(withPath(options.endpoint, '/admin/getStats'), options.token, {});
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const confirm = options.confirm || 'DROP_ALL_DATA';
  const totals: Record<string, number> = {};
  let pass = 0;

  while (true) {
    pass += 1;
    const result = (await postJson(
      withPath(options.endpoint, '/admin/resetAllData'),
      options.token,
      {
        confirm,
        batchSize: options.batchSize,
      }
    )) as {
      deleted?: Record<string, number>;
      deletedTotal?: number;
      hasMore?: boolean;
      batchSize?: number;
      status?: string;
    };

    const deleted = result.deleted || {};
    for (const [table, count] of Object.entries(deleted)) {
      totals[table] = (totals[table] || 0) + count;
    }

    console.log(
      `[reset pass ${pass}] status=${result.status || 'unknown'} batchSize=${
        result.batchSize || options.batchSize
      } deletedTotal=${result.deletedTotal || 0}`
    );

    if (!result.hasMore) {
      console.log(
        JSON.stringify(
          {
            status: 'ok',
            passes: pass,
            deleted: totals,
            deletedTotal: Object.values(totals).reduce((acc, n) => acc + n, 0),
          },
          null,
          2
        )
      );
      break;
    }

    if ((result.deletedTotal || 0) === 0) {
      throw new Error(
        'Reset quedó en loop sin borrar filas. Revisar endpoint /admin/resetAllData.'
      );
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
