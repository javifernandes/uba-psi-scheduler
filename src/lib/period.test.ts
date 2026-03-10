import { describe, expect, it } from 'vitest';
import { isPeriodId, normalizePeriod, periodFromCatalogHtml } from './period';

describe('period utils', () => {
  it('valida y normaliza formatos de período', () => {
    expect(isPeriodId('2026-01')).toBe(true);
    expect(isPeriodId('2026-03')).toBe(false);
    expect(normalizePeriod('2026-02')).toBe('2026-02');
    expect(normalizePeriod('2026/2')).toBe('2026-02');
    expect(normalizePeriod('2026-1')).toBe('2026-01');
    expect(normalizePeriod('hola')).toBeNull();
  });

  it('detecta período desde el HTML del catálogo', () => {
    expect(periodFromCatalogHtml('<div>Horarios a cursos 2026 / 1</div>')).toBe('2026-01');
    expect(periodFromCatalogHtml('<span>Oferta 2027/2</span>')).toBe('2027-02');
    expect(periodFromCatalogHtml('<div>sin periodo</div>')).toBeNull();
  });
});
