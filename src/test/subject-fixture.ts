import type {
  Comision,
  Seminario,
  SlotAsociado,
  SubjectData,
  Teorico,
} from '@/components/scheduler/scheduler.types';

type LegacySubjectFixture = {
  id: string;
  label: string;
  header: string;
  teoricos?: string[];
  seminarios?: string[];
  comisiones?: string[];
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const parseAssociations = (obligRaw: string) => {
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
  return associations.sort((a, b) => {
    const roleDiff = a.rol.localeCompare(b.rol, 'es');
    if (roleDiff !== 0) return roleDiff;
    return a.slotId.localeCompare(b.slotId, 'es');
  });
};

const parseVacantes = (value: string | undefined) => {
  const clean = normalizeText(value || '');
  if (!clean) return null;
  const parsed = Number.parseInt(clean, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const parseTeorico = (raw: string): Teorico => {
  const parts = raw.split('|');
  return {
    tipo: 'teo',
    id: parts[0] || '',
    dia: (parts[1] || '').replace('miércoles', 'miercoles') as Teorico['dia'],
    inicio: parts[2] || '',
    fin: parts[3] || '',
    profesor: parts[4] || '',
    aula: parts[5] || '',
    ...(parts[6] ? { observ: parts[6] } : {}),
  };
};

const parseSeminario = (raw: string): Seminario => {
  const parts = raw.split('|');
  return {
    tipo: 'sem',
    id: parts[0] || '',
    dia: (parts[1] || '').replace('miércoles', 'miercoles') as Seminario['dia'],
    inicio: parts[2] || '',
    fin: parts[3] || '',
    profesor: parts[4] || '',
    aula: parts[5] || '',
    ...(parts[6] ? { observ: parts[6] } : {}),
  };
};

const parseComision = (raw: string): Comision => {
  const parts = raw.split('|');
  const obligRaw = normalizeText(parts[5] || '');
  const parsed: Comision = {
    tipo: 'prac',
    id: parts[0] || '',
    dia: (parts[1] || '').replace('miércoles', 'miercoles') as Comision['dia'],
    inicio: parts[2] || '',
    fin: parts[3] || '',
    profesor: parts[4] || '',
    aula: parts[6] || '',
    ...(parts[7] ? { observ: parts[7] } : {}),
    vacantes: parseVacantes(parts[8]),
    slotsAsociados: parseAssociations(obligRaw),
  };
  return parsed;
};

export const subjectFromLegacyFixture = (fixture: LegacySubjectFixture): SubjectData => ({
  schemaVersion: 2,
  id: fixture.id,
  label: fixture.label,
  header: fixture.header,
  slots: [
    ...(fixture.teoricos || []).map(parseTeorico),
    ...(fixture.seminarios || []).map(parseSeminario),
    ...(fixture.comisiones || []).map(parseComision),
  ],
});
