import type {
  CalendarEvent,
  Comision,
  Day,
  ParsedSubject,
  Seminario,
  SubjectData,
  Teorico,
  VenueCode,
} from './psicologia-scheduler.types';

export const DAYS: Day[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

export const DAY_LABELS: Record<Day, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export const VENUE_LABELS: Record<string, string> = {
  IN: 'Independencia',
  SI: 'San Isidro',
  HY: 'Anexo Hipólito Yrigoyen',
  ND: 'No informada',
  OTRO: 'No informada',
};

const KNOWN_VENUE_ORDER = ['IN', 'HY', 'SI'] as const;

export const venueLabel = (code: VenueCode) => VENUE_LABELS[code] || `Sede ${code}`;
export const venueBadgeCode = (code: VenueCode) => (code === 'OTRO' ? 'N/D' : code);

export const sortVenueCodes = (venues: Iterable<VenueCode>) => {
  const unique = Array.from(new Set(Array.from(venues).map(code => code.trim().toUpperCase())));
  const rank = (code: VenueCode) => {
    if (code === 'ND' || code === 'OTRO') return 99;
    const knownIndex = KNOWN_VENUE_ORDER.indexOf(code as (typeof KNOWN_VENUE_ORDER)[number]);
    if (knownIndex >= 0) return knownIndex;
    return 50;
  };
  return unique.sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b, 'es');
  });
};

const parseRows = <T>(lines: string[], mapper: (parts: string[]) => T): T[] =>
  lines.map(line => line.split('|')).map(mapper);

const parseOblig = (oblig: string) => {
  const [rawTeoricoId, rawSeminarioId] = oblig.split('-').map(part => part.trim());
  return {
    teoricoId: rawTeoricoId || undefined,
    seminarioId: rawSeminarioId || undefined,
  };
};

export const h2m = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const m2h = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const overlapRange = (fromA: string, toA: string, fromB: string, toB: string) => ({
  start: m2h(Math.max(h2m(fromA), h2m(fromB))),
  end: m2h(Math.min(h2m(toA), h2m(toB))),
});

export const venueCodeFromAula = (aula: string): VenueCode => {
  const normalized = aula.trim().toUpperCase();
  const matchedPrefix = normalized.match(/^([A-Z]{2,5})(?:\b|[-\s/])/)?.[1];
  if (!matchedPrefix) return 'ND';
  return matchedPrefix;
};

export const catedraProfessorFromHeader = (header: string) =>
  header.split(' - ').at(-1)?.trim() || '';

export const displaySubjectLabel = (label: string) =>
  label.replace(/^\((\d+)\)\s*/, '$1 · ');

export const displayHeaderLabel = (header: string) =>
  header.replace(/-\s*\((\d+)\)\s*/, '- $1 · ');

export const materiaGroupFromLabel = (label: string) => {
  const match = label.match(/^\((\d+)\)\s*(.*?)\s*-\s*Cátedra/i);
  if (match) return { key: match[1], label: `${match[1]} · ${match[2].trim()}` };
  const fallback = label.split('- Cátedra')[0]?.trim() || label;
  return { key: fallback, label: fallback };
};

export const catedraFragmentFromLabel = (label: string) =>
  label.match(/Cátedra\s+\d+\s*(\([^)]+\))?/i)?.[0] || label;

export const catedraNumberFromLabel = (label: string) =>
  Number.parseInt(label.match(/Cátedra\s+(\d+)/i)?.[1] || '999999', 10);

export const dayShort = (day: Day) => DAY_LABELS[day].slice(0, 3);

export const shortTeacherName = (raw: string, max = 18) => {
  const clean = raw.replaceAll(',', '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

export const splitAula = (aula: string) => {
  if (!aula.includes('-')) return { prefix: aula, room: '' };
  const [prefix, ...rest] = aula.split('-');
  return { prefix, room: rest.join('-') };
};

export const splitEventTitle = (title: string) => {
  const [code, ...rest] = title.split(' - ');
  return { code, label: rest.join(' - ') };
};

export const slotKeyForEvent = (event: CalendarEvent) =>
  `${event.dia}|${event.inicio}|${event.fin}`;

export const ENROLLMENTS_STORAGE_KEY = 'uba_psico_planner_v1';
export const ENROLLMENTS_EXPORT_VERSION = 1;
export const ENROLLMENTS_EXPORT_TYPE = 'enrollments-projection';

export type EnrollmentProjectionEntry = {
  catedra: number;
  comision: number | string;
};

export type EnrollmentsExportPayload = {
  version: number;
  type: string;
  exportedAt: string;
  period: string;
  enrollments: EnrollmentProjectionEntry[];
};

export type EnrollmentProjectionMappedEntry = {
  catedra: number;
  comision: string;
  subjectId: string;
  subjectLabel: string;
};

export type EnrollmentProjectionRejectedEntry = {
  catedra: number;
  comision: string;
  reason: 'catedra_no_encontrada' | 'comision_no_encontrada';
};

export const buildEnrollmentsExportPayload = (
  enrollments: EnrollmentProjectionEntry[],
  period: string
): EnrollmentsExportPayload => ({
  version: ENROLLMENTS_EXPORT_VERSION,
  type: ENROLLMENTS_EXPORT_TYPE,
  exportedAt: new Date().toISOString(),
  period,
  enrollments,
});

export const parseEnrollmentsImportPayload = (raw: string): EnrollmentsExportPayload => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Formato inválido: el contenido debe ser un objeto JSON.');
  }
  const payload = parsed as Partial<EnrollmentsExportPayload>;
  if (typeof payload.version !== 'number') {
    throw new Error('Formato inválido: falta `version`.');
  }
  if (payload.version !== ENROLLMENTS_EXPORT_VERSION) {
    throw new Error(
      `Versión de archivo no soportada (${payload.version}). Esperada: ${ENROLLMENTS_EXPORT_VERSION}.`
    );
  }
  if (payload.type !== ENROLLMENTS_EXPORT_TYPE) {
    throw new Error(`Tipo de archivo no soportado (${payload.type || 'desconocido'}).`);
  }
  if (!Array.isArray(payload.enrollments)) {
    throw new Error('Formato inválido: falta `enrollments`.');
  }
  const enrollments = payload.enrollments.reduce<EnrollmentProjectionEntry[]>((acc, item) => {
    if (!item || typeof item !== 'object') return acc;
    const catedra = Number((item as EnrollmentProjectionEntry).catedra);
    const comision = (item as EnrollmentProjectionEntry).comision;
    if (!Number.isFinite(catedra)) return acc;
    if (typeof comision !== 'number' && typeof comision !== 'string') return acc;
    acc.push({
      catedra,
      comision,
    });
    return acc;
  }, []);
  return {
    version: payload.version,
    type: payload.type,
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : '',
    period: typeof payload.period === 'string' ? payload.period : '',
    enrollments,
  };
};

export const mapProjectionEnrollmentsToSubjectMap = (
  enrollments: EnrollmentProjectionEntry[],
  subjects: SubjectData[]
) => {
  const subjectIdByCatedra = Object.fromEntries(
    subjects.map(subject => [catedraNumberFromLabel(subject.label), subject.id])
  ) as Record<number, string>;
  const commissionIdsBySubjectId = Object.fromEntries(
    subjects.map(subject => [
      subject.id,
      new Set(subject.comisiones.map(row => row.split('|')[0]?.trim() || '')),
    ])
  ) as Record<string, Set<string>>;
  const nextBySubject: Record<string, string> = {};
  const mapped: EnrollmentProjectionMappedEntry[] = [];
  const rejected: EnrollmentProjectionRejectedEntry[] = [];
  const subjectIdByMateriaCode: Record<string, string> = {};

  enrollments.forEach(enrollment => {
    const subjectId = subjectIdByCatedra[enrollment.catedra];
    if (!subjectId) {
      rejected.push({
        catedra: enrollment.catedra,
        comision: String(enrollment.comision).trim(),
        reason: 'catedra_no_encontrada',
      });
      return;
    }
    const commissionId = String(enrollment.comision).trim();
    if (!commissionId) {
      rejected.push({
        catedra: enrollment.catedra,
        comision: '',
        reason: 'comision_no_encontrada',
      });
      return;
    }
    const allowedCommissions = commissionIdsBySubjectId[subjectId];
    if (!allowedCommissions || !allowedCommissions.has(commissionId)) {
      rejected.push({
        catedra: enrollment.catedra,
        comision: commissionId,
        reason: 'comision_no_encontrada',
      });
      return;
    }
    const subject = subjects.find(item => item.id === subjectId);
    if (!subject) return;
    const materiaCode = materiaCodeFromLabel(subject.label);
    const existingSubjectId = subjectIdByMateriaCode[materiaCode];
    if (existingSubjectId) {
      delete nextBySubject[existingSubjectId];
      const previousIndex = mapped.findIndex(item => item.subjectId === existingSubjectId);
      if (previousIndex >= 0) mapped.splice(previousIndex, 1);
    }
    subjectIdByMateriaCode[materiaCode] = subjectId;
    nextBySubject[subjectId] = commissionId;
    mapped.push({
      catedra: enrollment.catedra,
      comision: commissionId,
      subjectId,
      subjectLabel: subject.label,
    });
  });

  return {
    mappedBySubject: nextBySubject,
    mapped,
    rejected,
  };
};

export const materiaCodeFromLabel = (label: string) => label.match(/^\((\d+)\)/)?.[1] || label;

export const rangesOverlap = (fromA: string, toA: string, fromB: string, toB: string) =>
  Math.max(h2m(fromA), h2m(fromB)) < Math.min(h2m(toA), h2m(toB));

export const sameSetValues = <T>(a: Set<T>, b: Set<T>) => {
  if (a.size !== b.size) return false;
  return Array.from(a).every(value => b.has(value));
};

export const sameRecord = (a: Record<string, string>, b: Record<string, string>) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => a[key] === b[key]);
};

export const commissionSummaryLabel = (c: Comision) => `${c.id} ${c.profesor}`;

export const matchesCommissionQuery = (c: Comision, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    c.profesor.toLowerCase().includes(q) ||
    c.dia.toLowerCase().includes(q) ||
    DAY_LABELS[c.dia].toLowerCase().includes(q)
  );
};

export const sortComisiones = (comisiones: Comision[]) =>
  [...comisiones].sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.dia) - DAYS.indexOf(b.dia);
    if (dayDiff !== 0) return dayDiff;
    return h2m(a.inicio) - h2m(b.inicio);
  });

export const parseSubject = (subject: SubjectData): ParsedSubject => {
  const teoricos = parseRows<Teorico>(subject.teoricos, parts => ({
    id: parts[0],
    dia: parts[1] as Day,
    inicio: parts[2],
    fin: parts[3],
    profesor: parts[4],
    aula: parts[5],
    observ: parts[6] || '',
  }));
  const seminarios = parseRows<Seminario>(subject.seminarios, parts => ({
    id: parts[0],
    dia: parts[1] as Day,
    inicio: parts[2],
    fin: parts[3],
    profesor: parts[4],
    aula: parts[5],
    observ: parts[6] || '',
  }));
  const comisiones = parseRows<Comision>(subject.comisiones, parts => {
    const refs = parseOblig(parts[5]);
    return {
      id: parts[0],
      dia: parts[1] as Day,
      inicio: parts[2],
      fin: parts[3],
      profesor: parts[4],
      oblig: parts[5],
      teoricoId: refs.teoricoId,
      seminarioId: refs.seminarioId,
      aula: parts[6],
      observ: parts[7] || '',
    };
  });
  return {
    id: subject.id,
    label: subject.label,
    header: subject.header,
    teoricos,
    seminarios,
    comisiones,
    teoricoMap: Object.fromEntries(teoricos.map(t => [t.id, t])) as Record<string, Teorico>,
    seminarioMap: Object.fromEntries(seminarios.map(s => [s.id, s])) as Record<string, Seminario>,
  };
};

export const startHour = 7;
export const endHour = 24;
export const hourRows = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
export const headerHeightPx = 42;
export const hourHeightPx = 48;
export const timeColumnWidthPx = 72;
