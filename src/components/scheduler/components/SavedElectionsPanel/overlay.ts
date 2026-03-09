import type { ReservedSlot, SavedElectionDetail } from '../../psicologia-scheduler.types';
import { overlapRange } from '../../psicologia-scheduler.utils';

type SavedSlotForConflict = {
  slotId: string;
  subjectId: string;
  subjectLabel: string;
  day: SavedElectionDetail['commission']['dia'];
  start: string;
  end: string;
  title: string;
};

type SlotCenter = {
  slotId: string;
  y: number;
};

export type SavedConflictOverlayData = {
  bubbleTop: number;
  bubbleHeight: number;
  bubbleLeft: number;
  bubbleWidth: number;
  trunkX: number;
  branchStartX: number;
  bubbleAnchorY: number;
  segments: SlotCenter[];
  conflicts: Array<
    ReservedSlot & {
      overlapStart: string;
      overlapEnd: string;
    }
  >;
};

type BuildSavedConflictOverlayParams = {
  hoveredSavedConflictSlotId: string;
  panelHeight: number;
  conflictDetails: ReservedSlot[];
  slotCenters: SlotCenter[];
  hoveredSlot: SavedSlotForConflict;
};

export const buildSavedConflictOverlay = ({
  hoveredSavedConflictSlotId,
  panelHeight,
  conflictDetails,
  slotCenters,
  hoveredSlot,
}: BuildSavedConflictOverlayParams): SavedConflictOverlayData | null => {
  if (!conflictDetails.length || !slotCenters.length) return null;

  const connectedSlotIds = new Set([
    hoveredSavedConflictSlotId,
    ...conflictDetails.map(item => item.slotId),
  ]);
  const segments = slotCenters.filter(item => connectedSlotIds.has(item.slotId));
  if (!segments.length) return null;

  const minY = Math.min(...segments.map(segment => segment.y));
  const maxY = Math.max(...segments.map(segment => segment.y));
  const bubbleWidth = 276;
  const bubbleHeight = Math.max(98, 58 + Math.min(3, conflictDetails.length) * 38);
  const bubbleLeft = -bubbleWidth - 44;
  const bubbleTop = Math.max(
    8,
    Math.min((minY + maxY) / 2 - bubbleHeight / 2, Math.max(8, panelHeight - bubbleHeight - 8))
  );
  const bubbleAnchorY = bubbleTop + bubbleHeight / 2;

  return {
    bubbleTop,
    bubbleHeight,
    bubbleLeft,
    bubbleWidth,
    trunkX: -16,
    branchStartX: -2,
    bubbleAnchorY,
    segments,
    conflicts: conflictDetails.map(conflict => {
      const range = overlapRange(hoveredSlot.start, hoveredSlot.end, conflict.start, conflict.end);
      return {
        ...conflict,
        overlapStart: range.start,
        overlapEnd: range.end,
      };
    }),
  };
};
