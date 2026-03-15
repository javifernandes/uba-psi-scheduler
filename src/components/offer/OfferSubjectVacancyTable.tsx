'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import type { VacancyTrends } from '@/lib/offer-api';
import {
  catedraFragmentFromLabel,
  catedraNumberFromLabel,
  catedraProfessorFromHeader,
  materiaGroupFromLabel,
} from '@/components/scheduler/scheduler.utils';

type SortDirection = 'asc' | 'desc';
type SortKey = 'id' | 'name' | 'vacancies';

type SubjectVacancyTableProps = {
  subjects: SubjectData[];
  trends: VacancyTrends | null;
  loading: boolean;
};

type CatedraVacancyRow = {
  id: string;
  key: string;
  catedra: string;
  professor: string;
  vacancies: number;
  catedraOrder: number;
};

type MateriaVacancyRow = {
  id: string;
  key: string;
  name: string;
  vacancies: number;
  catedras: CatedraVacancyRow[];
};

type DisplayVacancyRow =
  | { kind: 'materia'; row: MateriaVacancyRow }
  | { kind: 'catedra'; row: CatedraVacancyRow; parentKey: string };

type VacanciesCellProps = {
  vacancies: number;
  maxVacancies: number;
};

type SparklineMiniProps = {
  points: number[] | undefined;
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

const parseMateriaIdentity = (subject: SubjectData) => {
  const grouped = materiaGroupFromLabel(subject.label);
  const [idFromLabel, ...nameParts] = grouped.label.split(' · ');
  const idCandidate = /^\d+$/.test(grouped.key)
    ? grouped.key
    : /^\d+$/.test(idFromLabel || '')
      ? idFromLabel
      : subject.id;
  const parsedName = nameParts.join(' · ').trim();
  return {
    id: idCandidate,
    name: parsedName || grouped.label.trim(),
  };
};

const sumComisionVacancies = (subject: SubjectData) =>
  subject.slots.reduce((total, slot) => {
    if (slot.tipo !== 'prac') return total;
    return typeof slot.vacantes === 'number' ? total + slot.vacantes : total;
  }, 0);

const toCatedraVacancyRow = (subject: SubjectData, materiaId: string): CatedraVacancyRow => ({
  id: materiaId,
  key: subject.id,
  catedra: catedraFragmentFromLabel(subject.label),
  professor: catedraProfessorFromHeader(subject.header),
  vacancies: sumComisionVacancies(subject),
  catedraOrder: catedraNumberFromLabel(subject.label),
});

const toMateriaVacancyRows = (subjects: SubjectData[]) => {
  const byMateria = new Map<string, MateriaVacancyRow>();

  subjects.forEach((subject) => {
    const materia = parseMateriaIdentity(subject);
    const groupKey = `${materia.id}::${materia.name}`;
    const catedraRow = toCatedraVacancyRow(subject, materia.id);
    const existing = byMateria.get(groupKey);
    if (existing) {
      existing.catedras.push(catedraRow);
      existing.vacancies += catedraRow.vacancies;
      return;
    }
    byMateria.set(groupKey, {
      id: materia.id,
      key: groupKey,
      name: materia.name,
      vacancies: catedraRow.vacancies,
      catedras: [catedraRow],
    });
  });

  return Array.from(byMateria.values()).map((materia) => ({
    ...materia,
    catedras: [...materia.catedras].sort((a, b) => {
      const byNumber = a.catedraOrder - b.catedraOrder;
      if (byNumber !== 0) return byNumber;
      return a.catedra.localeCompare(b.catedra, 'es');
    }),
  }));
};

const asNumericId = (id: string) => {
  const numeric = Number.parseInt(id, 10);
  return Number.isNaN(numeric) ? null : numeric;
};

const VacanciesCell = ({ vacancies, maxVacancies }: VacanciesCellProps) => {
  const ratio = maxVacancies > 0 ? (vacancies / maxVacancies) * 100 : 0;
  const barWidth = ratio > 0 ? Math.max(6, ratio) : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right font-semibold">{vacancies}</span>
      <div className="h-2.5 w-full min-w-[120px] overflow-hidden rounded-full bg-[#f3e8ef]">
        <div
          className={`h-full rounded-full ${barClassByVacancy(vacancies)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};

const trendStrokeColor = (points: number[]) => {
  if (points.length < 2) return '#8c7a8a';
  const delta = points[points.length - 1]! - points[0]!;
  if (delta < 0) return '#d04870';
  if (delta > 0) return '#2f9b65';
  return '#8c7a8a';
};

const sparklineGeometry = (points: number[], width: number, height: number) => {
  if (points.length === 0) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const usableWidth = width - 4;
  const usableHeight = height - 6;
  const denominator = max - min;
  const chartPoints = points.map((point, index) => {
    const x =
      points.length === 1 ? 2 : 2 + (index / (points.length - 1)) * Math.max(1, usableWidth);
    const y =
      denominator === 0 ? 3 + usableHeight / 2 : 3 + ((max - point) / denominator) * usableHeight;
    return { x, y };
  });
  return {
    path: chartPoints
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
      .join(' '),
    lastY: chartPoints[chartPoints.length - 1]?.y ?? height / 2,
  };
};

const SparklineMini = ({ points }: SparklineMiniProps) => {
  if (!points?.length) return <span className="text-[11px] text-[#9c8392]">s/d</span>;
  const normalized = points.length > 1 ? points : [points[0]!, points[0]!];
  const width = 98;
  const height = 26;
  const geometry = sparklineGeometry(normalized, width, height);
  if (!geometry) return <span className="text-[11px] text-[#9c8392]">s/d</span>;
  const stroke = trendStrokeColor(normalized);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={geometry.path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx={width - 2} cy={geometry.lastY} r="1.75" fill={stroke} />
    </svg>
  );
};

export const OfferSubjectVacancyTable = ({
  subjects,
  trends,
  loading,
}: SubjectVacancyTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedMaterias, setExpandedMaterias] = useState<Set<string>>(() => new Set());

  const materiaRows = useMemo(() => toMateriaVacancyRows(subjects), [subjects]);

  const sortedMaterias = useMemo(() => {
    const direction = sortDirection === 'desc' ? -1 : 1;
    const copy = [...materiaRows];
    copy.sort((a, b) => {
      if (sortKey === 'id') {
        const aNumeric = asNumericId(a.id);
        const bNumeric = asNumericId(b.id);
        if (aNumeric !== null && bNumeric !== null) {
          return (aNumeric - bNumeric) * direction;
        }
        return a.id.localeCompare(b.id, 'es') * direction;
      }
      if (sortKey === 'name') {
        return a.name.localeCompare(b.name, 'es') * direction;
      }
      return (a.vacancies - b.vacancies) * direction;
    });
    return copy;
  }, [materiaRows, sortDirection, sortKey]);

  const displayRows = useMemo(() => {
    const rows: DisplayVacancyRow[] = [];
    sortedMaterias.forEach((materia) => {
      rows.push({ kind: 'materia', row: materia });
      if (expandedMaterias.has(materia.key)) {
        materia.catedras.forEach((catedra) => {
          rows.push({ kind: 'catedra', row: catedra, parentKey: materia.key });
        });
      }
    });
    return rows;
  }, [expandedMaterias, sortedMaterias]);

  const subjectTrendMap = useMemo(() => new Map(Object.entries(trends?.subject || {})), [trends]);
  const materiaTrendMap = useMemo(() => new Map(Object.entries(trends?.materia || {})), [trends]);

  const maxVacancies = useMemo(
    () => displayRows.reduce((acc, row) => Math.max(acc, row.row.vacancies), 0),
    [displayRows]
  );

  const applySort = (nextKey: SortKey) => {
    const active = sortKey === nextKey;
    setSortDirection(nextDirection(sortDirection, active));
    setSortKey(nextKey);
  };

  const toggleMateria = (materiaKey: string) => {
    setExpandedMaterias((previous) => {
      const next = new Set(previous);
      if (next.has(materiaKey)) {
        next.delete(materiaKey);
      } else {
        next.add(materiaKey);
      }
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#4f1237]">Vacantes por materia</h2>
        {loading ? <span className="text-xs text-[#6f3b58]">actualizando…</span> : null}
      </div>

      <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-[#ead9e2]">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[84px]" />
            <col />
            <col className="w-[260px]" />
            <col className="w-[126px]" />
          </colgroup>
          <thead className="text-left text-[#7b4a65]">
            <tr>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-2 py-2">
                <button type="button" className={headerButtonClass} onClick={() => applySort('id')}>
                  ID {sortIndicator(sortKey === 'id', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('name')}
                >
                  Materia / Cátedra {sortIndicator(sortKey === 'name', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('vacancies')}
                >
                  Vacantes {sortIndicator(sortKey === 'vacancies', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-2 py-2 font-semibold text-[#7b4a65]">
                Tendencia
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((entry) =>
              entry.kind === 'materia' ? (
                <tr
                  key={entry.row.key}
                  className="border-t border-[#f0e4eb] bg-[#fcf7fa] text-[#4f1237]"
                >
                  <td className="whitespace-nowrap px-2 py-2 font-semibold">{entry.row.id}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-left"
                      onClick={() => toggleMateria(entry.row.key)}
                      aria-expanded={expandedMaterias.has(entry.row.key)}
                    >
                      {expandedMaterias.has(entry.row.key) ? (
                        <ChevronDown size={14} className="text-[#7b4a65]" />
                      ) : (
                        <ChevronRight size={14} className="text-[#7b4a65]" />
                      )}
                      <span className="font-semibold text-[#4f1237]">{entry.row.name}</span>
                      <span className="text-[11px] text-[#7b4a65]">
                        ({entry.row.catedras.length} cátedras)
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <VacanciesCell vacancies={entry.row.vacancies} maxVacancies={maxVacancies} />
                  </td>
                  <td className="px-2 py-2">
                    <SparklineMini points={materiaTrendMap.get(entry.row.id)} />
                  </td>
                </tr>
              ) : (
                <tr
                  key={`${entry.parentKey}::${entry.row.key}`}
                  className="border-t border-[#f0e4eb] text-[#4f1237]"
                >
                  <td className="whitespace-nowrap px-2 py-2 text-[#7b4a65]">{entry.row.id}</td>
                  <td className="px-3 py-2">
                    <div className="pl-5">
                      <p className="font-medium text-[#5b2e46]">{entry.row.catedra}</p>
                      {entry.row.professor ? (
                        <p className="text-[11px] text-[#7b4a65]">
                          Profesor: {entry.row.professor}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <VacanciesCell vacancies={entry.row.vacancies} maxVacancies={maxVacancies} />
                  </td>
                  <td className="px-2 py-2">
                    <SparklineMini points={subjectTrendMap.get(entry.row.key)} />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
