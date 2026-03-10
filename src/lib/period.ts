export type PeriodTerm = '01' | '02';
export type PeriodId = `${number}-${PeriodTerm}`;

const PERIOD_PATTERN = /^(\d{4})-(01|02)$/;

export const isPeriodId = (value: string): value is PeriodId => PERIOD_PATTERN.test(value);

export const normalizePeriod = (value: string): PeriodId | null => {
  const trimmed = value.trim();
  if (isPeriodId(trimmed)) return trimmed;
  const flexibleMatch = trimmed.match(/^(\d{4})\s*[-/]\s*([12]|0[12])$/);
  if (!flexibleMatch) return null;
  const year = flexibleMatch[1];
  const rawTerm = flexibleMatch[2];
  const term: PeriodTerm = rawTerm === '2' || rawTerm === '02' ? '02' : '01';
  return `${year}-${term}` as PeriodId;
};

export const periodFromCatalogHtml = (html: string): PeriodId | null => {
  const explicitMatch = html.match(/Horarios\s+a\s+cursos\s*(\d{4})\s*\/\s*([12])/i);
  if (explicitMatch?.[1] && explicitMatch?.[2]) {
    return normalizePeriod(`${explicitMatch[1]}-${explicitMatch[2]}`);
  }
  const fallbackMatch = html.match(/(\d{4})\s*\/\s*([12])/);
  if (!fallbackMatch?.[1] || !fallbackMatch?.[2]) return null;
  return normalizePeriod(`${fallbackMatch[1]}-${fallbackMatch[2]}`);
};
