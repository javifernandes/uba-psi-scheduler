import { useEffect, useRef } from 'react';
import { captureEvent } from '@/lib/posthog';
import type { ParsedSubject } from '../scheduler.types';

type UseSchedulerTelemetryEffectsParams = {
  careerSlug: string;
  selectedSubject: ParsedSubject | null;
  isCommissionDropdownOpen: boolean;
  commissionQuery: string;
  searchedComisionesLength: number;
};

export const useSchedulerTelemetryEffects = ({
  careerSlug,
  selectedSubject,
  isCommissionDropdownOpen,
  commissionQuery,
  searchedComisionesLength,
}: UseSchedulerTelemetryEffectsParams) => {
  const isFirstSubjectRenderRef = useRef(true);
  const previousCommissionDropdownOpenRef = useRef(isCommissionDropdownOpen);
  const commissionQueryTelemetryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedSubject) return;
    if (isFirstSubjectRenderRef.current) {
      isFirstSubjectRenderRef.current = false;
      return;
    }
    captureEvent('scheduler_subject_changed', {
      subject_id: selectedSubject.id,
      subject_label: selectedSubject.label,
    });
  }, [selectedSubject]);

  useEffect(() => {
    const wasOpen = previousCommissionDropdownOpenRef.current;
    if (!wasOpen && isCommissionDropdownOpen) {
      captureEvent('scheduler_commission_dropdown_opened', {
        career_slug: careerSlug,
        selected_subject_id: selectedSubject?.id || '',
        visible_count: searchedComisionesLength,
      });
    }
    if (wasOpen && !isCommissionDropdownOpen) {
      captureEvent('scheduler_commission_dropdown_closed', {
        career_slug: careerSlug,
        had_query: commissionQuery.trim().length > 0,
        query_length: commissionQuery.trim().length,
      });
    }
    previousCommissionDropdownOpenRef.current = isCommissionDropdownOpen;
  }, [
    careerSlug,
    commissionQuery,
    isCommissionDropdownOpen,
    searchedComisionesLength,
    selectedSubject?.id,
  ]);

  useEffect(() => {
    if (commissionQueryTelemetryTimeoutRef.current) {
      window.clearTimeout(commissionQueryTelemetryTimeoutRef.current);
      commissionQueryTelemetryTimeoutRef.current = null;
    }
    const query = commissionQuery.trim();
    if (query.length < 2) return;
    commissionQueryTelemetryTimeoutRef.current = window.setTimeout(() => {
      captureEvent('scheduler_commission_query_changed', {
        career_slug: careerSlug,
        selected_subject_id: selectedSubject?.id || '',
        query_length: query.length,
        result_count: searchedComisionesLength,
      });
      commissionQueryTelemetryTimeoutRef.current = null;
    }, 400);
    return () => {
      if (commissionQueryTelemetryTimeoutRef.current) {
        window.clearTimeout(commissionQueryTelemetryTimeoutRef.current);
        commissionQueryTelemetryTimeoutRef.current = null;
      }
    };
  }, [careerSlug, commissionQuery, searchedComisionesLength, selectedSubject?.id]);
};
