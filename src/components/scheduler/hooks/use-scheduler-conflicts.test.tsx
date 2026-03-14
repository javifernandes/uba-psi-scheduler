import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSchedulerConflicts } from './use-scheduler-conflicts';
import { parseSubject } from '../scheduler.utils';
import type { CalendarEvent, SubjectData } from '../scheduler.types';
import { subjectFromLegacyFixture } from '@/test/subject-fixture';

const subject34: SubjectData = subjectFromLegacyFixture({
  id: '34',
  label: '(1) Historia de la Psicología - Cátedra 34 (II)',
  header: 'header 34',
  teoricos: ['II|jueves|12:45|14:15|Ibarra Maria Florencia|IN-201|'],
  seminarios: ['C|miércoles|14:30|16:00|Rodriguez Sturla Pablo|HY-005|'],
  comisiones: ['21|jueves|14:30|16:00|Cazes Marcela Adriana|II - C|IN-444|'],
});

const subject36: SubjectData = subjectFromLegacyFixture({
  id: '36',
  label: '(2) Psicología Social - Cátedra 36 (II)',
  header: 'header 36',
  teoricos: ['II|jueves|14:30|16:00|Ferrari Liliana Edith|IN-208|'],
  seminarios: ['I|viernes|12:45|14:15|Schwarcz Lopez Aranguren|HY-014|'],
  comisiones: ['9|jueves|16:15|19:30|Fazzito Lorena Laura|II - I|IN-208|'],
});

const parsed34 = parseSubject(subject34);
const parsed36 = parseSubject(subject36);

const currentSubjectEvents: CalendarEvent[] = [
  {
    tipo: 'prac',
    id: 'prac-21',
    dia: 'jueves',
    inicio: '14:30',
    fin: '16:00',
    aula: 'IN-444',
    title: '21 - Cazes Marcela Adriana',
    linkedCommissionId: '21',
    sourceSubjectId: '34',
    sourceSubjectLabel: parsed34.label,
  },
  {
    tipo: 'teo',
    id: 'teo-II',
    dia: 'jueves',
    inicio: '12:45',
    fin: '14:15',
    aula: 'IN-201',
    title: 'II - Ibarra Maria Florencia',
    linkedCommissionId: '21',
    linkedSlotId: 'II',
    linkedSlotRole: 'teo',
    sourceSubjectId: '34',
    sourceSubjectLabel: parsed34.label,
  },
  {
    tipo: 'sem',
    id: 'ext-36-sem-I',
    dia: 'viernes',
    inicio: '12:45',
    fin: '14:15',
    aula: 'HY-014',
    title: 'I - Schwarcz Lopez Aranguren',
    linkedCommissionId: '9',
    linkedSlotId: 'I',
    linkedSlotRole: 'sem',
    sourceSubjectId: '36',
    sourceSubjectLabel: parsed36.label,
    isExternal: true,
  },
];

type HookParams = Parameters<typeof useSchedulerConflicts>[0];

const baseParams = (overrides: Partial<HookParams> = {}): HookParams => ({
  savedSubjects: [subject34, subject36],
  parsedSubjects: [parsed34, parsed36],
  enrolledBySubject: { '34': '21', '36': '9' },
  selectedSubjectId: '34',
  events: currentSubjectEvents,
  hoveredConflictEventId: null,
  ...overrides,
});

describe('useSchedulerConflicts', () => {
  it('detecta conflictos permanentes entre materias guardadas y los mapea por slot', () => {
    const { result } = renderHook(() => useSchedulerConflicts(baseParams()));

    expect(result.current.savedElectionDetails).toHaveLength(2);
    expect(result.current.savedConflictDetailsBySlot['34|prac|21']).toEqual([
      expect.objectContaining({
        slotId: '36|teo|II',
        subjectId: '36',
      }),
    ]);
    expect(result.current.savedConflictDetailsBySlot['36|teo|II']).toEqual([
      expect.objectContaining({
        slotId: '34|prac|21',
        subjectId: '34',
      }),
    ]);
    expect(result.current.alwaysConflictingSavedSlotIds.has('34|prac|21')).toBe(true);
    expect(result.current.alwaysConflictingSavedSlotIds.has('36|teo|II')).toBe(true);
  });

  it('calcula conflictos contra otras materias para eventos de la materia actual y resalta por hover', () => {
    const { result } = renderHook(() =>
      useSchedulerConflicts(
        baseParams({
          hoveredConflictEventId: 'prac-21',
        })
      )
    );

    expect(result.current.conflictByEventId['prac-21']).toEqual([
      expect.objectContaining({
        slotId: '36|teo|II',
      }),
    ]);
    expect(result.current.conflictByEventId['teo-II']).toBeUndefined();
    expect(result.current.conflictByEventId['ext-36-sem-I']).toBeUndefined();
    expect(Array.from(result.current.highlightedConflictSlotIds)).toEqual(['36|teo|II']);
  });

  it('devuelve highlightedConflictSlotIds vacío cuando no hay hoveredConflictEventId', () => {
    const { result } = renderHook(() =>
      useSchedulerConflicts(
        baseParams({
          hoveredConflictEventId: null,
        })
      )
    );

    expect(Array.from(result.current.highlightedConflictSlotIds)).toEqual([]);
  });

  it('no marca conflictos permanentes cuando solo hay una materia guardada', () => {
    const { result } = renderHook(() =>
      useSchedulerConflicts(
        baseParams({
          savedSubjects: [subject34],
          enrolledBySubject: { '34': '21' },
        })
      )
    );

    expect(result.current.savedElectionDetails).toHaveLength(1);
    expect(result.current.savedConflictDetailsBySlot).toEqual({});
    expect(Array.from(result.current.alwaysConflictingSavedSlotIds)).toEqual([]);
  });
});
