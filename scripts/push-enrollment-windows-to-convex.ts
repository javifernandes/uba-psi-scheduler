#!/usr/bin/env node

import './load-env';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type RawWindow = {
  id: string;
  label: string;
  start: string;
  end: string;
  enabled?: boolean;
};

type WindowsConfig = {
  windows?: RawWindow[];
};

type CliOptions = {
  configPath: string;
  endpoint: string;
  token: string;
  source: string;
};

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const byName = (name: string) => {
    const idx = args.findIndex((arg) => arg === name);
    return idx >= 0 ? args[idx + 1] || '' : '';
  };

  const configPath = path.resolve(
    byName('--config') || path.join(process.cwd(), 'config/scraper-windows.json')
  );
  const endpoint = byName('--endpoint') || process.env.CONVEX_INGEST_URL || '';
  const token = byName('--token') || process.env.VACANCY_INGEST_TOKEN || '';
  const source = byName('--source') || 'config/scraper-windows.json';

  if (!endpoint) {
    throw new Error('Falta endpoint. Usá --endpoint o CONVEX_INGEST_URL.');
  }
  if (!token) {
    throw new Error('Falta token. Usá --token o VACANCY_INGEST_TOKEN.');
  }

  return {
    configPath,
    endpoint,
    token,
    source,
  };
};

const inferPeriod = (window: RawWindow) => {
  const idMatch = window.id.match(/(\d{4})-(1c|2c)/i);
  if (idMatch?.[1] && idMatch[2]) {
    return `${idMatch[1]}-${idMatch[2].toLowerCase() === '2c' ? '02' : '01'}`;
  }

  const startMs = Date.parse(window.start);
  if (Number.isFinite(startMs)) {
    const start = new Date(startMs);
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth() + 1;
    return `${year}-${month <= 6 ? '01' : '02'}`;
  }

  throw new Error(`No se pudo inferir período para ventana ${window.id}`);
};

const inferKind = (window: RawWindow) => {
  const normalized = `${window.id} ${window.label}`.toLowerCase();
  if (normalized.includes('supplementary') || normalized.includes('suplement')) {
    return 'supplementary';
  }
  return 'main';
};

const withPath = (endpoint: string, pathName: string) =>
  `${endpoint.replace(/\/$/, '')}${pathName}`;

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
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return { payload };
  }
};

const main = async () => {
  const options = parseArgs();
  const raw = await fs.readFile(options.configPath, 'utf8');
  const parsed = JSON.parse(raw) as WindowsConfig;
  const windows = Array.isArray(parsed.windows) ? parsed.windows : [];

  const payload = windows.map((window) => ({
    windowId: window.id,
    label: window.label,
    careerSlug: '*',
    period: inferPeriod(window),
    startAt: window.start,
    endAt: window.end,
    kind: inferKind(window),
    enabled: window.enabled !== false,
  }));

  if (!payload.length) {
    throw new Error('No se encontraron ventanas para sincronizar.');
  }

  const result = await postJson(
    withPath(options.endpoint, '/upsertEnrollmentWindows'),
    options.token,
    {
      source: options.source,
      windows: payload,
    }
  );

  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
