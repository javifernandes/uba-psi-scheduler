import { describe, expect, it } from 'vitest';
import { collapsedComisionesSummary, collapsedMateriaSummary } from './summaries';

describe('SchedulerFiltersPanel summaries', () => {
  it('resuelve resumen colapsado de materia/cátedra', () => {
    expect(collapsedMateriaSummary('(2) Psicología Social - Cátedra 35 (I)')).toBe('Cátedra 35');
    expect(collapsedMateriaSummary('Materia sin formato')).toBe('Materia sin formato');
  });

  it('resuelve resumen colapsado de comisiones', () => {
    expect(collapsedComisionesSummary(3, 3)).toBe('todas');
    expect(collapsedComisionesSummary(1, 3)).toBe('1/3');
  });
});
