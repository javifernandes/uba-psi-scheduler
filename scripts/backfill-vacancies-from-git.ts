#!/usr/bin/env node

import './load-env';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

type SubjectData = {
  id: string;
  label: string;
  header: string;
  slots: unknown[];
};

type CliOptions = {
  endpoint: string;
  token: string;
  dryRun: boolean;
  maxCommits: number;
  sinceSha: string;
};

const DATA_PREFIX = 'src/data/uba/psicologia/oferta';

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const has = (flag: string) => args.includes(flag);
  const value = (flag: string) => {
    const idx = args.findIndex((arg) => arg === flag);
    return idx >= 0 ? args[idx + 1] || '' : '';
  };

  return {
    endpoint: value('--endpoint') || process.env.CONVEX_INGEST_URL || '',
    token: value('--token') || process.env.VACANCY_INGEST_TOKEN || '',
    dryRun: has('--dry-run'),
    maxCommits: Number.parseInt(value('--max-commits') || '999999', 10),
    sinceSha: value('--since-sha') || '',
  };
};

const runGit = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const withIngestPath = (endpoint: string) =>
  endpoint.endsWith('/ingestOfferProbe')
    ? endpoint
    : `${endpoint.replace(/\/$/, '')}/ingestOfferProbe`;

const parseSubjectPath = (filePath: string) => {
  const normalized = filePath.replaceAll('\\', '/');
  const rel = normalized.startsWith(`${DATA_PREFIX}/`)
    ? normalized.slice(DATA_PREFIX.length + 1)
    : '';
  if (!rel) return null;
  const parts = rel.split('/');
  if (parts.length < 4) return null;
  const [period, careerSlug, section] = parts;
  if (section !== 'materias') return null;
  return { period, careerSlug };
};

const readFileAtCommit = (sha: string, filePath: string) => runGit(['show', `${sha}:${filePath}`]);

const commitIso = (sha: string) => runGit(['show', '-s', '--format=%cI', sha]);

const listCommits = () => {
  const output = runGit(['rev-list', '--reverse', 'HEAD', '--', DATA_PREFIX]);
  if (!output) return [];
  return output.split('\n').filter(Boolean);
};

const listTrackedFilesAtCommit = (sha: string) => {
  const output = runGit(['ls-tree', '-r', '--name-only', sha, '--', DATA_PREFIX]);
  if (!output) return [];
  return output
    .split('\n')
    .filter(Boolean)
    .filter((file) => file.endsWith('.json') && file.includes('/materias/'));
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
      `HTTP ${response.status} en backfill ${careerSlug}/${period}${details ? `: ${details}` : ''}`
    );
  }
  return response.json();
};

const main = async () => {
  const options = parseArgs();
  if (!options.dryRun && (!options.endpoint || !options.token)) {
    throw new Error(
      'Para ejecución real, definí --endpoint/CONVEX_INGEST_URL y --token/VACANCY_INGEST_TOKEN.'
    );
  }

  const commits = listCommits();
  const startIndex =
    options.sinceSha && commits.includes(options.sinceSha) ? commits.indexOf(options.sinceSha) : 0;
  const selectedCommits = commits.slice(startIndex, startIndex + options.maxCommits);

  console.log(`Backfill commits: ${selectedCommits.length} (desde índice ${startIndex}).`);

  for (const sha of selectedCommits) {
    const capturedAt = commitIso(sha);
    const files = listTrackedFilesAtCommit(sha);
    const groups = new Map<string, string[]>();

    files.forEach((filePath) => {
      const parsed = parseSubjectPath(filePath);
      if (!parsed) return;
      const key = `${parsed.period}|${parsed.careerSlug}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(filePath);
    });

    for (const [groupKey, groupFiles] of groups) {
      const [period, careerSlug] = groupKey.split('|');
      if (!period || !careerSlug) continue;

      const subjects: SubjectData[] = [];
      for (const filePath of groupFiles) {
        try {
          const raw = readFileAtCommit(sha, filePath);
          const parsed = JSON.parse(raw) as Partial<SubjectData>;
          if (
            typeof parsed?.id === 'string' &&
            typeof parsed?.label === 'string' &&
            typeof parsed?.header === 'string' &&
            Array.isArray(parsed?.slots)
          ) {
            subjects.push(parsed as SubjectData);
          }
        } catch {
          // ignora archivos no parseables en commit intermedio
        }
      }

      if (!subjects.length) continue;

      const sourceRunId = `git:${sha}:${careerSlug}:${period}`;
      const careerLabel = careerSlug;
      if (options.dryRun) {
        console.log(
          `[dry-run] commit=${sha.slice(0, 8)} ${careerSlug}/${period} subjects=${subjects.length}`
        );
        continue;
      }

      await postProbe({
        endpoint: options.endpoint,
        token: options.token,
        sourceRunId,
        capturedAt,
        careerSlug,
        careerLabel,
        period,
        subjects,
      });
      console.log(
        `[ok] commit=${sha.slice(0, 8)} ${careerSlug}/${period} subjects=${subjects.length}`
      );
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
