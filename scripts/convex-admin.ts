#!/usr/bin/env node

import './load-env';

type Command = 'stats' | 'reset';
type CommandWithCapacity = Command | 'recompute-capacity';

type CliOptions = {
  command: CommandWithCapacity;
  endpoint: string;
  token: string;
  confirm: string;
  careerSlug: string;
  period: string;
  batchSize: number;
};

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const command = (args[0] || '').trim() as CommandWithCapacity;
  const byName = (name: string) => {
    const idx = args.findIndex((arg) => arg === name);
    return idx >= 0 ? args[idx + 1] || '' : '';
  };

  if (command !== 'stats' && command !== 'reset' && command !== 'recompute-capacity') {
    throw new Error(
      'Uso: npm run convex:admin -- <stats|reset|recompute-capacity> [--endpoint ...] [--token ...]'
    );
  }

  const endpoint = byName('--endpoint') || process.env.CONVEX_INGEST_URL || '';
  const token =
    byName('--token') || process.env.CONVEX_ADMIN_TOKEN || process.env.VACANCY_INGEST_TOKEN || '';
  const confirm = byName('--confirm') || '';

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
    careerSlug: byName('--career') || '',
    period: byName('--period') || '',
    batchSize: Number.parseInt(byName('--batch-size') || '25', 10),
  };
};

const withPath = (endpoint: string, path: string) => `${endpoint.replace(/\/$/, '')}${path}`;

const postJson = async (url: string, token: string, body: unknown) => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
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

const recomputeForPair = async ({
  endpoint,
  token,
  careerSlug,
  period,
  batchSize,
}: {
  endpoint: string;
  token: string;
  careerSlug: string;
  period: string;
  batchSize: number;
}) => {
  let cursor: string | undefined;
  let done = false;
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalPatched = 0;

  while (!done) {
    const result = (await postJson(withPath(endpoint, '/admin/recomputeVacancyCapacity'), token, {
      careerSlug,
      period,
      cursor,
      batchSize,
    })) as {
      processed: number;
      inserted: number;
      patched: number;
      done: boolean;
      nextCursor?: string | null;
    };
    totalProcessed += result.processed || 0;
    totalInserted += result.inserted || 0;
    totalPatched += result.patched || 0;
    done = Boolean(result.done);
    cursor = result.nextCursor || undefined;
  }

  return {
    careerSlug,
    period,
    processed: totalProcessed,
    inserted: totalInserted,
    patched: totalPatched,
  };
};

const main = async () => {
  const options = parseArgs();
  if (options.command === 'stats') {
    const result = await postJson(withPath(options.endpoint, '/admin/getStats'), options.token, {});
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (options.command === 'reset') {
    const confirm = options.confirm || 'DROP_ALL_DATA';
    const result = await postJson(
      withPath(options.endpoint, '/admin/resetAllData'),
      options.token,
      { confirm }
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (options.command === 'recompute-capacity') {
    const batchSize = Number.isFinite(options.batchSize) ? options.batchSize : 25;
    if (options.careerSlug && options.period) {
      const result = await recomputeForPair({
        endpoint: options.endpoint,
        token: options.token,
        careerSlug: options.careerSlug,
        period: options.period,
        batchSize,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const careers = (await postJson(
      withPath(options.endpoint, '/listCareersWithLatestPeriod'),
      '',
      {}
    )) as Array<{ slug: string }>;
    const summary = [];
    for (const career of careers) {
      const periods = (await postJson(withPath(options.endpoint, '/listPeriodsByCareer'), '', {
        careerSlug: career.slug,
      })) as string[];
      for (const period of periods) {
        const result = await recomputeForPair({
          endpoint: options.endpoint,
          token: options.token,
          careerSlug: career.slug,
          period,
          batchSize,
        });
        summary.push(result);
      }
    }
    console.log(JSON.stringify({ status: 'ok', results: summary }, null, 2));
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
