#!/usr/bin/env node

import './load-env';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type CareerSummary = {
  slug: string;
  label: string;
};

type SubjectData = {
  id: string;
  label: string;
  header: string;
  slots: unknown[];
};

type CliOptions = {
  inputDir: string;
  endpoint: string;
  token: string;
  sourceRunId: string;
  capturedAt: string;
};

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const byName = (name: string) => {
    const idx = args.findIndex((arg) => arg === name);
    return idx >= 0 ? args[idx + 1] : '';
  };

  const inputDir = byName('--input-dir') || path.resolve(process.cwd(), 'tmp/probe-data');
  const endpoint = byName('--endpoint') || process.env.CONVEX_INGEST_URL || '';
  const token = byName('--token') || process.env.VACANCY_INGEST_TOKEN || '';
  const sourceRunId =
    byName('--source-run-id') ||
    `gha:${process.env.GITHUB_RUN_ID || 'local'}:${process.env.GITHUB_RUN_ATTEMPT || '1'}`;
  const capturedAt = byName('--captured-at') || new Date().toISOString();

  if (!endpoint) {
    throw new Error('Falta endpoint de ingesta. Usá --endpoint o CONVEX_INGEST_URL.');
  }
  if (!token) {
    throw new Error('Falta token de ingesta. Usá --token o VACANCY_INGEST_TOKEN.');
  }

  return {
    inputDir,
    endpoint,
    token,
    sourceRunId,
    capturedAt,
  };
};

const withIngestPath = (endpoint: string) =>
  endpoint.endsWith('/ingestOfferProbe')
    ? endpoint
    : `${endpoint.replace(/\/$/, '')}/ingestOfferProbe`;

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
};

const detectLatestPeriod = async (inputDir: string) => {
  const periodsIndexPath = path.join(inputDir, 'periods.generated.json');
  try {
    const parsed = await readJson<{ latest?: string }>(periodsIndexPath);
    if (typeof parsed.latest === 'string' && parsed.latest) return parsed.latest;
  } catch {
    // fallback below
  }

  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const periods = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const sorted = periods.sort((a, b) => b.localeCompare(a, 'en'));
  if (!sorted.length) {
    throw new Error(`No se encontraron períodos en ${inputDir}.`);
  }
  return sorted[0]!;
};

const loadSubjectsForCareer = async (
  inputDir: string,
  period: string,
  careerSlug: string
): Promise<SubjectData[]> => {
  const materiasDir = path.join(inputDir, period, careerSlug, 'materias');
  const files = await fs.readdir(materiasDir);
  const jsonFiles = files.filter((file) => file.endsWith('.json'));
  const subjects = await Promise.all(
    jsonFiles.map(async (file) => readJson<SubjectData>(path.join(materiasDir, file)))
  );
  return subjects;
};

const postProbe = async ({
  endpoint,
  token,
  sourceRunId,
  capturedAt,
  careerSlug,
  careerLabel,
  period,
  subjects,
}: {
  endpoint: string;
  token: string;
  sourceRunId: string;
  capturedAt: string;
  careerSlug: string;
  careerLabel: string;
  period: string;
  subjects: SubjectData[];
}) => {
  const response = await fetch(withIngestPath(endpoint), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sourceRunId,
      capturedAt,
      careerSlug,
      careerLabel,
      period,
      subjects,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      `Falló ingesta para ${careerSlug}/${period} (${response.status})${details ? `: ${details}` : ''}`
    );
  }

  return (await response.json()) as Record<string, unknown>;
};

const main = async () => {
  const options = parseArgs();
  const period = await detectLatestPeriod(options.inputDir);
  const careers = await readJson<CareerSummary[]>(
    path.join(options.inputDir, period, 'careers.generated.json')
  );
  if (!Array.isArray(careers) || !careers.length) {
    throw new Error(`No hay carreras en ${options.inputDir}/${period}/careers.generated.json`);
  }

  for (const career of careers) {
    if (!career?.slug || !career?.label) continue;
    const subjects = await loadSubjectsForCareer(options.inputDir, period, career.slug);
    const runId = `${options.sourceRunId}:${career.slug}:${period}`;
    const result = await postProbe({
      endpoint: options.endpoint,
      token: options.token,
      sourceRunId: runId,
      capturedAt: options.capturedAt,
      careerSlug: career.slug,
      careerLabel: career.label,
      period,
      subjects,
    });
    console.log(
      `[${career.slug}/${period}] subjects=${subjects.length} status=${String(result.status || 'ok')}`
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
