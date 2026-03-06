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

export const VENUE_LABELS: Record<VenueCode, string> = {
  IN: 'Independencia',
  SI: 'San Isidro',
  HY: 'Anexo Hipólito Yrigoyen',
  OTRO: 'Otra/No informada',
};

const parseRows = <T>(lines: string[], mapper: (parts: string[]) => T): T[] =>
  lines.map(line => line.split('|')).map(mapper);

const parseOblig = (oblig: string) => {
  const [teoricoId, seminarioId] = oblig.split('-').map(part => part.trim());
  return { teoricoId, seminarioId };
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
  if (aula.startsWith('IN-')) return 'IN';
  if (aula.startsWith('SI-')) return 'SI';
  if (aula.startsWith('HY-')) return 'HY';
  return 'OTRO';
};

export const catedraProfessorFromHeader = (header: string) =>
  header.split(' - ').at(-1)?.trim() || '';

export const materiaGroupFromLabel = (label: string) => {
  const match = label.match(/^\((\d+)\)\s*(.*?)\s*-\s*Cátedra/i);
  if (match) return { key: match[1], label: `(${match[1]}) ${match[2].trim()}` };
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
