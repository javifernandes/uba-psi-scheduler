import { describe, expect, it, vi } from 'vitest';
import { toParsedSubject } from './subject-schema-adapter';
import { subjectFromLegacyFixture } from '@/test/subject-fixture';

describe('subject schema adapter', () => {
  it('convierte subject v2 a ParsedSubject', () => {
    const subject = subjectFromLegacyFixture({
      id: '36',
      label: '(2) Psicología Social - Cátedra 36 (II)',
      header: 'header',
      teoricos: ['II|jueves|14:30|16:00|Ferrari|IN-208|'],
      seminarios: ['I|viernes|12:45|14:15|Schwarcz|HY-014|'],
      comisiones: ['9|jueves|16:15|19:30|Fazzito|II - I|IN-208||20'],
    });

    const parsed = toParsedSubject(subject);
    expect(parsed.comisiones).toHaveLength(1);
    expect(parsed.teoricoMap.II?.profesor).toContain('Ferrari');
    expect(parsed.seminarioMap.I?.profesor).toContain('Schwarcz');
  });

  it('advierte cuando una comisión tiene múltiples asociaciones obligatorias para el mismo rol', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const subject = {
      schemaVersion: 2 as const,
      id: 'x',
      label: 'Materia X',
      header: 'header',
      slots: [
        {
          tipo: 'prac' as const,
          id: '1',
          dia: 'lunes' as const,
          inicio: '10:00',
          fin: '11:00',
          profesor: 'Docente',
          aula: 'IN-101',
          observ: '',
          vacantes: 10,
          slotsAsociados: [
            { slotId: 'T1', rol: 'teo' as const, condicion: 'obligatorio' as const },
            { slotId: 'T2', rol: 'teo' as const, condicion: 'obligatorio' as const },
          ],
        },
      ],
    };

    toParsedSubject(subject);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
