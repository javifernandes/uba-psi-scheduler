#!/usr/bin/env node

import './load-env';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

type SubjectData = {
  schemaVersion: 2;
  id: string;
  label: string;
  header: string;
  slots: SubjectSlot[];
};

type SubjectSlot = {
  id: string;
  tipo: 'teo' | 'sem' | 'prac';
  dia: string;
  inicio: string;
  fin: string;
  profesor: string;
  lugar: {
    anexo: string | null;
    aula: string | null;
  };
  observ?: string;
  vacantes?: number | null;
  slotsAsociados?: Array<{
    slotId: string;
    rol: 'teo' | 'sem' | `custom:${string}`;
    condicion: 'obligatorio' | 'opcional';
  }>;
};

type LegacySubjectData = {
  id: string;
  label: string;
  header: string;
  teoricos: string[];
  seminarios: string[];
  comisiones: string[];
};

type CliOptions = {
  endpoint: string;
  token: string;
  dryRun: boolean;
  maxCommits: number;
  sinceSha: string;
  fallbackPeriod: string;
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
    fallbackPeriod: value('--fallback-period') || process.env.BACKFILL_FALLBACK_PERIOD || '2026-01',
  };
};

const runGit = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const withIngestPath = (endpoint: string) =>
  endpoint.endsWith('/ingestOfferProbe')
    ? endpoint
    : `${endpoint.replace(/\/$/, '')}/ingestOfferProbe`;

const parseSubjectPath = (filePath: string, fallbackPeriod: string) => {
  const normalized = filePath.replaceAll('\\', '/');
  const rel = normalized.startsWith(`${DATA_PREFIX}/`)
    ? normalized.slice(DATA_PREFIX.length + 1)
    : '';
  if (!rel) return null;
  const parts = rel.split('/');
  if (parts.length < 3) return null;
  let period = '';
  let careerSlug = '';
  let section = '';
  if (/^\d{4}-\d{2}$/.test(parts[0] || '')) {
    period = parts[0] || '';
    careerSlug = parts[1] || '';
    section = parts[2] || '';
  } else {
    period = fallbackPeriod;
    careerSlug = parts[0] || '';
    section = parts[1] || '';
  }
  if (!careerSlug || section !== 'materias') return null;
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

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const parseLugar = (rawAula: string) => {
  const clean = normalizeText(rawAula).toUpperCase();
  if (!clean) {
    return {
      anexo: null,
      aula: null,
    };
  }
  const match = clean.match(/^([A-Z]{2,5})(?:[-\s/](.+))?$/);
  if (!match?.[1]) {
    return {
      anexo: null,
      aula: clean,
    };
  }
  return {
    anexo: match[1],
    aula: normalizeText(match[2] || '') || null,
  };
};

const parseVacantes = (raw: string | undefined) => {
  const clean = normalizeText(raw || '');
  if (!clean) return null;
  const parsed = Number.parseInt(clean, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const normalizeAssociationsFromOblig = (obligRaw: string) => {
  const parts = normalizeText(obligRaw)
    .split('-')
    .map((part) => normalizeText(part))
    .filter(Boolean);
  const associations: SubjectSlot['slotsAsociados'] = [];
  if (parts[0]) {
    associations.push({
      slotId: parts[0],
      rol: 'teo',
      condicion: 'obligatorio',
    });
  }
  if (parts[1]) {
    associations.push({
      slotId: parts[1],
      rol: 'sem',
      condicion: 'obligatorio',
    });
  }
  return associations;
};

const parseLegacyTeoSemSlot = (raw: string, tipo: 'teo' | 'sem'): SubjectSlot => {
  const parts = raw.split('|');
  return {
    id: parts[0] || '',
    tipo,
    dia: parts[1] || '',
    inicio: parts[2] || '',
    fin: parts[3] || '',
    profesor: parts[4] || '',
    lugar: parseLugar(parts[5] || ''),
    ...(parts[6] ? { observ: parts[6] } : {}),
  };
};

const parseLegacyComisionSlot = (raw: string): SubjectSlot => {
  const parts = raw.split('|');
  const obligRaw = normalizeText(parts[5] || '');
  return {
    id: parts[0] || '',
    tipo: 'prac',
    dia: parts[1] || '',
    inicio: parts[2] || '',
    fin: parts[3] || '',
    profesor: parts[4] || '',
    lugar: parseLugar(parts[6] || ''),
    ...(parts[7] ? { observ: parts[7] } : {}),
    vacantes: parseVacantes(parts[8]),
    slotsAsociados: normalizeAssociationsFromOblig(obligRaw),
  };
};

const asV2Subject = (raw: unknown): SubjectData | null => {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<SubjectData>;
  if (
    typeof parsed.id === 'string' &&
    typeof parsed.label === 'string' &&
    typeof parsed.header === 'string' &&
    Array.isArray(parsed.slots)
  ) {
    return {
      schemaVersion: 2,
      id: parsed.id,
      label: parsed.label,
      header: parsed.header,
      slots: parsed.slots as SubjectSlot[],
    };
  }

  const legacy = raw as Partial<LegacySubjectData>;
  if (
    typeof legacy.id !== 'string' ||
    typeof legacy.label !== 'string' ||
    typeof legacy.header !== 'string' ||
    !Array.isArray(legacy.teoricos) ||
    !Array.isArray(legacy.seminarios) ||
    !Array.isArray(legacy.comisiones)
  ) {
    return null;
  }

  return {
    schemaVersion: 2,
    id: legacy.id,
    label: legacy.label,
    header: legacy.header,
    slots: [
      ...legacy.teoricos.map((slot) => parseLegacyTeoSemSlot(slot, 'teo')),
      ...legacy.seminarios.map((slot) => parseLegacyTeoSemSlot(slot, 'sem')),
      ...legacy.comisiones.map(parseLegacyComisionSlot),
    ],
  };
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
      const parsed = parseSubjectPath(filePath, options.fallbackPeriod);
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
          const parsed = asV2Subject(JSON.parse(raw) as unknown);
          if (parsed) subjects.push(parsed);
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
