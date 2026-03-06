import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSchedulerCalendar } from './use-scheduler-calendar';
import { parseSubject } from '../psicologia-scheduler.utils';
import type { ParsedSubject, SubjectData } from '../psicologia-scheduler.types';

const subjectAData: SubjectData = {
  id: 's1',
  label: '(2) Psicología Social - Cátedra 35 (I)',
  header: 'header',
  teoricos: ['I|lunes|10:00|11:00|Teorico Uno|IN-101|', 'II|lunes|11:00|12:00|Teorico Dos|IN-102|'],
  seminarios: [
    'A|martes|10:00|11:00|Seminario Uno|HY-005|',
    'B|martes|11:00|12:00|Seminario Dos|HY-006|',
  ],
  comisiones: [
    '1|lunes|09:00|10:30|Comision Uno|I - A|IN-201|',
    '2|lunes|09:00|10:30|Comision Dos|II - B|IN-202|',
  ],
};

const subjectBData: SubjectData = {
  id: 's2',
  label: '(1) Historia de la Psicología - Cátedra 34 (II)',
  header: 'header',
  teoricos: ['X|miércoles|08:00|09:30|Teorico Externo|IN-301|'],
  seminarios: ['Z|jueves|12:00|13:30|Seminario Externo|SI-020|'],
  comisiones: ['9|viernes|14:00|15:30|Comision Externa|X - Z|IN-401|'],
};

const subjectA = parseSubject(subjectAData);
const subjectB = parseSubject(subjectBData);

const subjectOnlyTeoricoData: SubjectData = {
  id: 's48',
  label: '(15) Neurofisiología - Cátedra 48 (I)',
  header: 'header',
  teoricos: [
    'V|martes|18:00|19:30|China, Norma Nancy|HY-014|',
    'I|martes|18:00|19:30|Otro Teorico|IN-101|',
  ],
  seminarios: ['A|jueves|08:00|09:00|Sem Uno|IN-111|'],
  comisiones: [
    '14|sabado|09:15|10:45|García, Adriana Verónica|V|IN-207|',
    '99|martes|18:00|19:30|Comision Superpuesta|I - A|IN-301|',
  ],
};

type HookParams = Parameters<typeof useSchedulerCalendar>[0];

const baseParams = (overrides: Partial<HookParams> = {}): HookParams => ({
  selectedSubject: subjectA,
  enrolledBySubject: {},
  selectedComisiones: subjectA.comisiones,
  filteredTeoricos: subjectA.teoricos,
  filteredSeminarios: subjectA.seminarios,
  parsedSubjects: [subjectA, subjectB],
  showComisiones: true,
  showTeoricos: false,
  showSeminarios: false,
  showOtherSubjects: false,
  hoveredCommissionId: null,
  pinnedCommissionId: null,
  stackIndexBySlot: {},
  ...overrides,
});

const eventIds = (result: ReturnType<typeof useSchedulerCalendar>) =>
  result.events.map(event => event.id);

const visibleBySlot = (result: ReturnType<typeof useSchedulerCalendar>) =>
  Object.fromEntries(
    result.visibleEventSlots.map(item => [
      item.slotKey,
      { eventId: item.event.id, stackSize: item.stackSize, stackIndex: item.stackIndex },
    ])
  );

describe('useSchedulerCalendar', () => {
  it('renderiza comisiones según filtros', () => {
    const { result } = renderHook(() => useSchedulerCalendar(baseParams()));

    expect(eventIds(result.current)).toEqual(['prac-1', 'prac-2']);
    expect(visibleBySlot(result.current)).toEqual({
      'lunes|09:00|10:30': {
        eventId: 'prac-1',
        stackSize: 2,
        stackIndex: 0,
      },
    });
  });

  it('muestra la tríada activa por hover aunque filtros estén apagados y sin duplicar eventos', () => {
    const { result } = renderHook(() =>
      useSchedulerCalendar(
        baseParams({
          showComisiones: false,
          showTeoricos: false,
          showSeminarios: false,
          hoveredCommissionId: '1',
        })
      )
    );

    expect(result.current.activeCommission?.id).toBe('1');
    expect(eventIds(result.current)).toEqual(['prac-1', 'teo-I', 'sem-A']);
  });

  it('prioriza hoveredCommissionId por encima de pinnedCommissionId', () => {
    const { result } = renderHook(() =>
      useSchedulerCalendar(
        baseParams({
          showComisiones: false,
          showTeoricos: false,
          showSeminarios: false,
          hoveredCommissionId: '1',
          pinnedCommissionId: '2',
        })
      )
    );

    expect(result.current.activeCommission?.id).toBe('1');
    expect(eventIds(result.current)).toEqual(['prac-1', 'teo-I', 'sem-A']);
  });

  it('muestra la tríada de inscripción actual aunque no haya hover y filtros estén apagados', () => {
    const { result } = renderHook(() =>
      useSchedulerCalendar(
        baseParams({
          showComisiones: false,
          showTeoricos: false,
          showSeminarios: false,
          enrolledBySubject: { s1: '2' },
        })
      )
    );

    expect(result.current.enrolledCurrentCommissionId).toBe('2');
    expect(result.current.activeCommission).toBeNull();
    expect(eventIds(result.current)).toEqual(['prac-2', 'teo-II', 'sem-B']);
  });

  it('incluye eventos externos de materias ya elegidas cuando showOtherSubjects está activo', () => {
    const { result } = renderHook(() =>
      useSchedulerCalendar(
        baseParams({
          showComisiones: false,
          showTeoricos: false,
          showSeminarios: false,
          showOtherSubjects: true,
          enrolledBySubject: { s2: '9' },
        })
      )
    );

    expect(eventIds(result.current)).toEqual(['ext-s2-prac-9', 'ext-s2-teo-X', 'ext-s2-sem-Z']);
    expect(result.current.events.every(event => event.isExternal)).toBe(true);
  });

  it('prioriza evento de comisión activa en slot superpuesto por encima del índice almacenado', () => {
    const { result, rerender } = renderHook(
      ({ params }: { params: HookParams }) => useSchedulerCalendar(params),
      {
        initialProps: {
          params: baseParams({
            stackIndexBySlot: { 'lunes|09:00|10:30': 1 },
          }),
        },
      }
    );

    expect(visibleBySlot(result.current)['lunes|09:00|10:30']).toEqual({
      eventId: 'prac-2',
      stackSize: 2,
      stackIndex: 1,
    });

    rerender({
      params: baseParams({
        hoveredCommissionId: '1',
        stackIndexBySlot: { 'lunes|09:00|10:30': 1 },
      }),
    });

    expect(visibleBySlot(result.current)['lunes|09:00|10:30']).toEqual({
      eventId: 'prac-1',
      stackSize: 2,
      stackIndex: 0,
    });
  });

  it('normaliza stackIndexBySlot negativo usando módulo del stack size', () => {
    const { result } = renderHook(() =>
      useSchedulerCalendar(
        baseParams({
          stackIndexBySlot: { 'lunes|09:00|10:30': -1 },
        })
      )
    );

    expect(visibleBySlot(result.current)['lunes|09:00|10:30']).toEqual({
      eventId: 'prac-2',
      stackSize: 2,
      stackIndex: 1,
    });
  });

  it('en hover de comisión sin seminario prioriza el teórico vinculado y no un evento no relacionado del mismo slot', () => {
    const subject = parseSubject(subjectOnlyTeoricoData);

    const { result } = renderHook(() =>
      useSchedulerCalendar({
        selectedSubject: subject,
        enrolledBySubject: {},
        selectedComisiones: subject.comisiones,
        filteredTeoricos: subject.teoricos,
        filteredSeminarios: subject.seminarios,
        parsedSubjects: [subject],
        showComisiones: true,
        showTeoricos: false,
        showSeminarios: false,
        showOtherSubjects: false,
        hoveredCommissionId: '14',
        pinnedCommissionId: null,
        stackIndexBySlot: {},
      })
    );

    expect(visibleBySlot(result.current)['martes|18:00|19:30']).toEqual({
      eventId: 'teo-V',
      stackSize: 2,
      stackIndex: 1,
    });
  });
});
