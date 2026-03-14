import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCalendarEventCardState } from './useCalendarEventCardState';
import type { Comision } from '../../scheduler.types';
import type { VisibleEventSlot } from './types';

const activeCommission: Comision = {
  tipo: 'prac',
  id: '21',
  dia: 'jueves',
  inicio: '14:30',
  fin: '16:00',
  profesor: 'Cazes',
  aula: 'IN-444',
  slotsAsociados: [
    { slotId: 'C', rol: 'sem', condicion: 'obligatorio' },
    { slotId: 'II', rol: 'teo', condicion: 'obligatorio' },
  ],
  vacantes: 20,
};

const externalTeoricoSlot: VisibleEventSlot = {
  slotKey: 'jueves|14:30|16:00',
  stackSize: 1,
  stackIndex: 0,
  event: {
    tipo: 'teo',
    id: 'ext-s1-teo-II',
    dia: 'jueves',
    inicio: '14:30',
    fin: '16:00',
    aula: 'IN-201',
    title: 'II - Otro Profesor',
    linkedCommissionId: '9',
    linkedSlotId: 'II',
    linkedSlotRole: 'teo',
    sourceSubjectId: 's1',
    sourceSubjectLabel: 'Materia A',
    isExternal: true,
  },
  slotEvents: [],
};

describe('useCalendarEventCardState', () => {
  it('no marca eventos externos como activos aunque compartan IDs de teo/sem con la materia actual', () => {
    const { result } = renderHook(() =>
      useCalendarEventCardState({
        slot: externalTeoricoSlot,
        activeCommission,
        selectedSubjectId: 's2',
        enrolledBySubject: { s1: '9' },
        enrolledCurrentCommissionId: undefined,
        conflictByEventId: {},
        hoveredConflictEventId: null,
      })
    );

    expect(result.current.isActive).toBe(false);
    expect(result.current.shouldDim).toBe(false);
  });
});
