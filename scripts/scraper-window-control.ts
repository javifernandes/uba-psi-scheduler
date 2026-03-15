#!/usr/bin/env node

import './load-env';

type Command = 'status' | 'close';

type CliOptions = {
  command: Command;
  endpoint: string;
  token: string;
  trigger: 'schedule' | 'manual';
  force: boolean;
  windowId: string;
};

type StatusResponse = {
  shouldRun: boolean;
  reason: string;
  trigger: 'schedule' | 'manual';
  profile: string;
  activeWindowId: string;
  activeWindowLabel?: string;
  nowIso: string;
  nowLocal: string;
};

type CloseResponse = {
  status: string;
  closedWindowId: string;
  closeAt: string;
};

const withPath = (endpoint: string, pathName: string) =>
  `${endpoint.replace(/\/$/, '')}${pathName}`;

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const command = (args[0] || '').trim() as Command;
  const byName = (name: string) => {
    const idx = args.findIndex((arg) => arg === name);
    return idx >= 0 ? args[idx + 1] || '' : '';
  };

  if (command !== 'status' && command !== 'close') {
    throw new Error(
      'Uso: scraper-window-control.ts <status|close> [--endpoint ...] [--trigger schedule|manual] [--force true|false] [--window-id ...]'
    );
  }

  const endpoint = byName('--endpoint') || process.env.CONVEX_INGEST_URL || '';
  if (!endpoint) {
    throw new Error('Falta endpoint. Usá --endpoint o CONVEX_INGEST_URL.');
  }

  const trigger = byName('--trigger') === 'schedule' ? 'schedule' : 'manual';
  const force = byName('--force') === 'true';
  const windowId = byName('--window-id') || '';
  const token =
    byName('--token') || process.env.CONVEX_ADMIN_TOKEN || process.env.VACANCY_INGEST_TOKEN || '';

  return {
    command,
    endpoint,
    token,
    trigger,
    force,
    windowId,
  };
};

const appendOutput = async (pairs: Record<string, string>) => {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = Object.entries(pairs).map(([key, value]) => `${key}=${value}`);
  const { promises: fs } = await import('node:fs');
  await fs.appendFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
};

const postJson = async <T>(url: string, token: string, body: unknown): Promise<T> => {
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

  return JSON.parse(payload) as T;
};

const runStatus = async (options: CliOptions) => {
  const result = await postJson<StatusResponse>(
    withPath(options.endpoint, '/getScrapeWindowStatus'),
    '',
    {
      trigger: options.trigger,
      force: options.force,
    }
  );

  await appendOutput({
    should_run: String(result.shouldRun),
    status_reason: result.reason,
    active_window_id: result.activeWindowId || '',
    active_profile: result.profile || 'none',
    now_iso: result.nowIso,
    now_local: result.nowLocal,
  });

  console.log(JSON.stringify(result, null, 2));
};

const runClose = async (options: CliOptions) => {
  if (!options.token) {
    throw new Error('Falta token para cerrar ventana. Usá --token o CONVEX_ADMIN_TOKEN.');
  }

  const result = await postJson<CloseResponse>(
    withPath(options.endpoint, '/closeEnrollmentWindow'),
    options.token,
    {
      windowId: options.windowId || undefined,
      source: 'manual-close-script',
    }
  );

  await appendOutput({
    closed_window_id: result.closedWindowId,
    close_at: result.closeAt,
  });

  console.log(JSON.stringify(result, null, 2));
};

const main = async () => {
  const options = parseArgs();
  if (options.command === 'status') {
    await runStatus(options);
    return;
  }
  await runClose(options);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
