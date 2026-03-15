#!/usr/bin/env node

import './load-env';

type Command = 'stats' | 'reset';

type CliOptions = {
  command: Command;
  endpoint: string;
  token: string;
  confirm: string;
};

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const command = (args[0] || '').trim() as Command;
  const byName = (name: string) => {
    const idx = args.findIndex((arg) => arg === name);
    return idx >= 0 ? args[idx + 1] || '' : '';
  };

  if (command !== 'stats' && command !== 'reset') {
    throw new Error('Uso: npm run convex:admin -- <stats|reset> [--endpoint ...] [--token ...]');
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
  const result = await postJson(withPath(options.endpoint, '/admin/resetAllData'), options.token, {
    confirm,
  });
  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
