import type { ParsedSubject, SubjectData } from '@/components/scheduler/scheduler.types';
import { findAssociatedSlotIds, parseSubject } from '@/components/scheduler/scheduler.utils';

const warnMultipleRequiredAssociations = (
  subject: Pick<ParsedSubject, 'id' | 'label'>,
  commission: ParsedSubject['comisiones'][number]
) => {
  (['teo', 'sem'] as const).forEach((role) => {
    const required = findAssociatedSlotIds(commission, role, 'obligatorio');
    if (required.length <= 1) return;
    console.warn(
      `[subject-schema-adapter] ${subject.id} (${subject.label}) comisión ${commission.id} tiene múltiples asociaciones obligatorias para rol "${role}". Se usará la primera.`
    );
  });
};

export const toParsedSubject = (subject: SubjectData): ParsedSubject => {
  const parsed = parseSubject(subject);
  parsed.comisiones.forEach((commission) => {
    warnMultipleRequiredAssociations(parsed, commission);
  });
  return parsed;
};
