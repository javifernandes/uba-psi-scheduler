#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type SlotTipo = 'teo' | 'sem' | 'prac';
type SlotAsociado = {
  slotId: string;
  rol: 'teo' | 'sem' | `custom:${string}`;
  condicion: 'obligatorio' | 'opcional';
};

type SlotBase = {
  id: string;
  tipo: SlotTipo;
  dia: string;
  inicio: string;
  fin: string;
  profesor: string;
  aula: string;
  observ?: string;
};

type TeoricoSlot = SlotBase & { tipo: 'teo' };
type SeminarioSlot = SlotBase & { tipo: 'sem' };
type ComisionSlot = SlotBase & {
  tipo: 'prac';
  vacantes: number | null;
  slotsAsociados: SlotAsociado[];
};

type SubjectSlot = TeoricoSlot | SeminarioSlot | ComisionSlot;

type SubjectDataV2 = {
  schemaVersion: 2;
  id: string;
  label: string;
  header: string;
  slots: SubjectSlot[];
};

type SubjectLegacy = {
  id: string;
  label: string;
  header: string;
  teoricos: string[];
  seminarios: string[];
  comisiones: string[];
};

const DATA_ROOT = path.resolve(process.cwd(), 'src/data/uba/psicologia/oferta');
const DAY_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const SLOT_KIND_ORDER: Record<SlotTipo, number> = { teo: 0, sem: 1, prac: 2 };

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const h2m = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const sortAssociations = (associations: SlotAsociado[]) =>
  [...associations].sort((a, b) => {
    const roleDiff = a.rol.localeCompare(b.rol, 'es');
    if (roleDiff !== 0) return roleDiff;
    return a.slotId.localeCompare(b.slotId, 'es');
  });

const normalizeAssociationsFromOblig = (obligRaw: string) => {
  const parts = normalizeText(obligRaw)
    .split('-')
    .map((part) => normalizeText(part))
    .filter(Boolean);
  const associations: SlotAsociado[] = [];
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
  return sortAssociations(associations);
};

const normalizeSlot = (slot: SubjectSlot): SubjectSlot => {
  const observ = normalizeText(slot.observ || '');
  const base = {
    id: normalizeText(slot.id),
    tipo: slot.tipo,
    dia: normalizeText(slot.dia),
    inicio: normalizeText(slot.inicio),
    fin: normalizeText(slot.fin),
    profesor: normalizeText(slot.profesor),
    aula: normalizeText(slot.aula),
    ...(observ ? { observ } : {}),
  } as const;

  if (slot.tipo === 'prac') {
    const normalizedVacantes =
      typeof slot.vacantes === 'number' && Number.isFinite(slot.vacantes) && slot.vacantes >= 0
        ? slot.vacantes
        : null;
    const normalized: ComisionSlot = {
      ...base,
      tipo: 'prac',
      vacantes: normalizedVacantes,
      slotsAsociados: sortAssociations(
        (slot.slotsAsociados || [])
          .map((association) => ({
            slotId: normalizeText(association.slotId),
            rol: association.rol,
            condicion: association.condicion,
          }))
          .filter((association) => association.slotId.length > 0)
      ),
    };
    return normalized;
  }

  if (slot.tipo === 'teo') return { ...base, tipo: 'teo' };
  return { ...base, tipo: 'sem' };
};

const sortSlots = (slots: SubjectSlot[]) =>
  [...slots].sort((a, b) => {
    const typeDiff = SLOT_KIND_ORDER[a.tipo] - SLOT_KIND_ORDER[b.tipo];
    if (typeDiff !== 0) return typeDiff;
    const dayDiff = DAY_ORDER.indexOf(a.dia) - DAY_ORDER.indexOf(b.dia);
    if (dayDiff !== 0) return dayDiff;
    const startDiff = h2m(a.inicio) - h2m(b.inicio);
    if (startDiff !== 0) return startDiff;
    return a.id.localeCompare(b.id, 'es');
  });

const parseVacantes = (raw: string | undefined) => {
  const clean = normalizeText(raw || '');
  if (!clean) return null;
  const parsed = Number.parseInt(clean, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const parseLegacyTeoSemSlot = (raw: string, tipo: 'teo' | 'sem') => {
  const parts = raw.split('|');
  const slot: TeoricoSlot | SeminarioSlot = {
    id: parts[0] || '',
    tipo,
    dia: parts[1] || '',
    inicio: parts[2] || '',
    fin: parts[3] || '',
    profesor: parts[4] || '',
    aula: parts[5] || '',
    ...(parts[6] ? { observ: parts[6] } : {}),
  };
  return normalizeSlot(slot);
};

const parseLegacyComisionSlot = (raw: string) => {
  const parts = raw.split('|');
  const obligRaw = normalizeText(parts[5] || '');
  const slot: ComisionSlot = {
    id: parts[0] || '',
    tipo: 'prac',
    dia: parts[1] || '',
    inicio: parts[2] || '',
    fin: parts[3] || '',
    profesor: parts[4] || '',
    aula: parts[6] || '',
    ...(parts[7] ? { observ: parts[7] } : {}),
    vacantes: parseVacantes(parts[8]),
    slotsAsociados: normalizeAssociationsFromOblig(obligRaw),
  };
  return normalizeSlot(slot);
};

const fromLegacy = (subject: SubjectLegacy): SubjectDataV2 => {
  const slots = sortSlots([
    ...(subject.teoricos || []).map((raw) => parseLegacyTeoSemSlot(raw, 'teo')),
    ...(subject.seminarios || []).map((raw) => parseLegacyTeoSemSlot(raw, 'sem')),
    ...(subject.comisiones || []).map(parseLegacyComisionSlot),
  ]);
  return {
    schemaVersion: 2,
    id: subject.id,
    label: subject.label,
    header: subject.header,
    slots,
  };
};

const normalizeV2 = (subject: SubjectDataV2): SubjectDataV2 => ({
  schemaVersion: 2,
  id: subject.id,
  label: subject.label,
  header: subject.header,
  slots: sortSlots((subject.slots || []).map(normalizeSlot)),
});

const isV2 = (subject: unknown): subject is SubjectDataV2 =>
  Boolean(
    subject &&
    typeof subject === 'object' &&
    (subject as SubjectDataV2).schemaVersion === 2 &&
    Array.isArray((subject as SubjectDataV2).slots)
  );

const isLegacy = (subject: unknown): subject is SubjectLegacy =>
  Boolean(
    subject &&
    typeof subject === 'object' &&
    Array.isArray((subject as SubjectLegacy).teoricos) &&
    Array.isArray((subject as SubjectLegacy).seminarios) &&
    Array.isArray((subject as SubjectLegacy).comisiones)
  );

const listSubjectFiles = async () => {
  const files = await fs.readdir(DATA_ROOT, { recursive: true });
  return files
    .filter((file) => typeof file === 'string')
    .map((file) => file.toString())
    .filter((file) => file.endsWith('.json') && file.includes(`${path.sep}materias${path.sep}`))
    .map((file) => path.join(DATA_ROOT, file));
};

const main = async () => {
  const files = await listSubjectFiles();
  let migrated = 0;
  let normalized = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    let next: SubjectDataV2 | null = null;
    let action: 'migrated' | 'normalized' | 'skipped' = 'skipped';

    if (isLegacy(parsed)) {
      next = fromLegacy(parsed);
      action = 'migrated';
    } else if (isV2(parsed)) {
      next = normalizeV2(parsed);
      action = 'normalized';
    } else {
      action = 'skipped';
    }

    if (!next) {
      skipped += 1;
      continue;
    }

    await fs.writeFile(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    if (action === 'migrated') migrated += 1;
    if (action === 'normalized') normalized += 1;
  }

  console.log(`Archivos procesados: ${files.length}`);
  console.log(`Migrados desde legacy: ${migrated}`);
  console.log(`Normalizados v2: ${normalized}`);
  console.log(`Saltados: ${skipped}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
