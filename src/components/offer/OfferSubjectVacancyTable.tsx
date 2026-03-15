'use client';

import { useMemo, useState } from 'react';
import type { SubjectData } from '@/components/scheduler/scheduler.types';

type SortDirection = 'asc' | 'desc';
type SortKey = 'id' | 'label' | 'vacancies';

type SubjectVacancyTableProps = {
  subjects: SubjectData[];
  loading: boolean;
};

type SubjectVacancyRow = {
  id: string;
  label: string;
  vacancies: number;
  knownCommissions: number;
  totalCommissions: number;
  idNumeric: number | null;
};

const barClassByVacancy = (vacancies: number) => {
  if (vacancies === 0) return 'bg-[#d04870]';
  if (vacancies <= 10) return 'bg-[#cf8d00]';
  return 'bg-[#2f9b65]';
};

const headerButtonClass =
  'inline-flex items-center gap-1 font-semibold text-[#7b4a65] hover:text-[#4f1237]';

const nextDirection = (current: SortDirection, active: boolean): SortDirection =>
  !active ? 'desc' : current === 'desc' ? 'asc' : 'desc';

const sortIndicator = (active: boolean, direction: SortDirection) => {
  if (!active) return '↕';
  return direction === 'desc' ? '↓' : '↑';
};

const toVacancyRow = (subject: SubjectData): SubjectVacancyRow => {
  let vacancies = 0;
  let knownCommissions = 0;
  let totalCommissions = 0;

  subject.slots.forEach((slot) => {
    if (slot.tipo !== 'prac') return;
    totalCommissions += 1;
    if (typeof slot.vacantes === 'number') {
      knownCommissions += 1;
      vacancies += slot.vacantes;
    }
  });

  const idNumericMatch = subject.id.match(/\d+/);
  const idNumeric = idNumericMatch ? Number.parseInt(idNumericMatch[0], 10) : null;

  return {
    id: subject.id,
    label: subject.label,
    vacancies,
    knownCommissions,
    totalCommissions,
    idNumeric,
  };
};

export const OfferSubjectVacancyTable = ({ subjects, loading }: SubjectVacancyTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const rows = useMemo(() => subjects.map(toVacancyRow), [subjects]);

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'desc' ? -1 : 1;
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortKey === 'label') {
        return a.label.localeCompare(b.label) * direction;
      }
      if (sortKey === 'vacancies') {
        return (a.vacancies - b.vacancies) * direction;
      }
      if (a.idNumeric !== null && b.idNumeric !== null && a.idNumeric !== b.idNumeric) {
        return (a.idNumeric - b.idNumeric) * direction;
      }
      if (a.idNumeric !== null && b.idNumeric === null) return -1 * direction;
      if (a.idNumeric === null && b.idNumeric !== null) return 1 * direction;
      return a.id.localeCompare(b.id) * direction;
    });
    return copy;
  }, [rows, sortDirection, sortKey]);

  const maxVacancies = useMemo(
    () => sortedRows.reduce((acc, row) => Math.max(acc, row.vacancies), 0),
    [sortedRows]
  );

  const applySort = (nextKey: SortKey) => {
    const active = sortKey === nextKey;
    setSortDirection(nextDirection(sortDirection, active));
    setSortKey(nextKey);
  };

  return (
    <section className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#4f1237]">
          Vacantes por materia (suma de cátedras)
        </h2>
        {loading ? <span className="text-xs text-[#6f3b58]">actualizando…</span> : null}
      </div>

      <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-[#ead9e2]">
        <table className="w-full border-collapse text-xs">
          <thead className="text-left text-[#7b4a65]">
            <tr>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button type="button" className={headerButtonClass} onClick={() => applySort('id')}>
                  ID {sortIndicator(sortKey === 'id', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('label')}
                >
                  Materia {sortIndicator(sortKey === 'label', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('vacancies')}
                >
                  Vacantes agregadas {sortIndicator(sortKey === 'vacancies', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2 font-semibold">
                Comisiones con dato
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const barWidth = maxVacancies > 0 ? (row.vacancies / maxVacancies) * 100 : 0;
              return (
                <tr key={row.id} className="border-t border-[#f0e4eb] text-[#4f1237]">
                  <td className="px-3 py-2 font-semibold">{row.id}</td>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-10 text-right font-semibold">{row.vacancies}</span>
                      <div className="h-2.5 w-full min-w-[120px] overflow-hidden rounded-full bg-[#f3e8ef]">
                        <div
                          className={`h-full rounded-full ${barClassByVacancy(row.vacancies)}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {row.knownCommissions}/{row.totalCommissions}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
