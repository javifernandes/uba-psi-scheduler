import { describe, expect, it } from 'vitest';
import { buildSavedConflictOverlay } from './overlay';

describe('buildSavedConflictOverlay', () => {
  it('retorna null si no hay conflictos o segmentos conectados', () => {
    const overlay = buildSavedConflictOverlay({
      hoveredSavedConflictSlotId: '34|prac|21',
      panelHeight: 500,
      conflictDetails: [],
      slotCenters: [{ slotId: '34|prac|21', y: 100 }],
      hoveredSlot: {
        slotId: '34|prac|21',
        subjectId: '34',
        subjectLabel: 'A',
        day: 'jueves',
        start: '14:30',
        end: '16:00',
        title: '21 - Cazes',
      },
    });

    expect(overlay).toBeNull();
  });

  it('calcula geometría y rangos de solapamiento para el bubble', () => {
    const overlay = buildSavedConflictOverlay({
      hoveredSavedConflictSlotId: '34|prac|21',
      panelHeight: 220,
      conflictDetails: [
        {
          slotId: '36|teo|II',
          subjectId: '36',
          subjectLabel: '(2) Psicología Social',
          day: 'jueves',
          start: '15:00',
          end: '17:00',
          title: 'II - Ferrari',
        },
      ],
      slotCenters: [
        { slotId: '34|prac|21', y: 80 },
        { slotId: '36|teo|II', y: 150 },
      ],
      hoveredSlot: {
        slotId: '34|prac|21',
        subjectId: '34',
        subjectLabel: 'A',
        day: 'jueves',
        start: '14:30',
        end: '16:00',
        title: '21 - Cazes',
      },
    });

    expect(overlay).not.toBeNull();
    expect(overlay?.bubbleWidth).toBe(276);
    expect(overlay?.trunkX).toBe(-16);
    expect(overlay?.segments).toHaveLength(2);
    expect(overlay?.conflicts[0]).toMatchObject({
      overlapStart: '15:00',
      overlapEnd: '16:00',
    });
  });
});
