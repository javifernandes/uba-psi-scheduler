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
const subjectSharedTeoricoData: SubjectData = {
  id: 's-shared',
  label: '(20) Materia Shared - Cátedra 20 (I)',
  header: 'header',
  teoricos: ['T1|miercoles|10:00|11:30|Teorico Compartido|IN-701|'],
  seminarios: [],
  comisiones: [
    '31|lunes|07:00|08:30|Comision A|T1|IN-711|',
    '32|martes|07:00|08:30|Comision B|T1|IN-712|',
  ],
};
const subjectSharedSeminarioData: SubjectData = {
  id: 's-shared-sem',
  label: '(21) Materia Shared Sem - Cátedra 21 (I)',
  header: 'header',
  teoricos: ['T2|jueves|11:00|12:30|Teorico Asociado|IN-721|'],
  seminarios: ['S1|jueves|11:00|12:30|Seminario Compartido|IN-722|'],
  comisiones: [
    '41|lunes|08:00|09:30|Comision S A|T2 - S1|IN-731|',
    '42|martes|08:00|09:30|Comision S B|T2 - S1|IN-732|',
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
  hoveredLinkedTeoricoId: null,
  hoveredLinkedSeminarioId: null,
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
        hoveredLinkedTeoricoId: null,
        hoveredLinkedSeminarioId: null,
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

  it('en hover de teórico muestra todas las comisiones asociadas aunque comisiones esté apagado', () => {
    const subject = parseSubject(subjectSharedTeoricoData);
    const { result } = renderHook(() =>
      useSchedulerCalendar({
        selectedSubject: subject,
        enrolledBySubject: {},
        selectedComisiones: subject.comisiones,
        filteredTeoricos: subject.teoricos,
        filteredSeminarios: subject.seminarios,
        parsedSubjects: [subject],
        showComisiones: false,
        showTeoricos: true,
        showSeminarios: false,
        showOtherSubjects: false,
        hoveredCommissionId: null,
        hoveredLinkedTeoricoId: 'T1',
        hoveredLinkedSeminarioId: null,
        pinnedCommissionId: null,
        stackIndexBySlot: {},
      })
    );

    expect(eventIds(result.current)).toEqual(['teo-T1', 'prac-31', 'prac-32']);
  });

  it('en hover de seminario muestra solo sus comisiones directas y no teóricos transitivos', () => {
    const subject = parseSubject(subjectSharedSeminarioData);
    const { result } = renderHook(() =>
      useSchedulerCalendar({
        selectedSubject: subject,
        enrolledBySubject: {},
        selectedComisiones: subject.comisiones,
        filteredTeoricos: subject.teoricos,
        filteredSeminarios: subject.seminarios,
        parsedSubjects: [subject],
        showComisiones: false,
        showTeoricos: false,
        showSeminarios: true,
        showOtherSubjects: false,
        hoveredCommissionId: null,
        hoveredLinkedTeoricoId: null,
        hoveredLinkedSeminarioId: 'S1',
        pinnedCommissionId: null,
        stackIndexBySlot: {},
      })
    );

    expect(eventIds(result.current)).toEqual(['sem-S1', 'prac-41', 'prac-42']);
    expect(result.current.events.some(event => event.id === 'teo-T2')).toBe(false);
  });
});
