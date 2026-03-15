'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import type { VacancyCapacityItem, VacancyCapacityResponse, VacancyTrends } from '@/lib/offer-api';
import {
  catedraFragmentFromLabel,
  catedraNumberFromLabel,
  catedraProfessorFromHeader,
  materiaGroupFromLabel,
} from '@/components/scheduler/scheduler.utils';
import { vacancyStatusFromCapacity, type VacancyStatus } from '@/domain/vacancies';

type SortDirection = 'asc' | 'desc';
type SortKey = 'id' | 'name' | 'vacancies';
type BaselineQuality = 'pre_window' | 'post_window' | 'unknown';

type SubjectVacancyTableProps = {
  subjects: SubjectData[];
  trends: VacancyTrends | null;
  capacity: VacancyCapacityResponse | null;
  loading: boolean;
};

type CapacityMetrics = {
  current: number;
  max: number | null;
  initial: number | null;
  quality: BaselineQuality;
  initialCapturedAt: string | null;
  maxCapturedAt: string | null;
};

type CatedraVacancyRow = {
  id: string;
  key: string;
  catedra: string;
  professor: string;
  catedraOrder: number;
  metrics: CapacityMetrics;
};

type MateriaVacancyRow = {
  id: string;
  key: string;
  name: string;
  catedras: CatedraVacancyRow[];
  metrics: CapacityMetrics;
};

type DisplayVacancyRow =
  | { kind: 'materia'; row: MateriaVacancyRow }
  | { kind: 'catedra'; row: CatedraVacancyRow; parentKey: string };

type SelectedDetail =
  | { kind: 'materia'; materia: MateriaVacancyRow }
  | { kind: 'catedra'; catedra: CatedraVacancyRow; materia: MateriaVacancyRow | null };

type VacanciesCellProps = {
  metrics: CapacityMetrics;
  fallbackMax: number;
};

type SparklineMiniProps = {
  points: number[] | undefined;
  width?: number;
  height?: number;
};

const headerButtonClass =
  'inline-flex items-center gap-1 font-semibold text-[#7b4a65] hover:text-[#4f1237]';

const baselineQualityLabel: Record<BaselineQuality, string> = {
  pre_window: 'Inicial observado antes de apertura',
  post_window: 'Inicial observado con ventana abierta',
  unknown: 'Sin referencia de apertura',
};

const statusToneClass: Record<VacancyStatus, string> = {
  sin_datos: 'bg-[#8c7a8a]',
  sin_cupo: 'bg-[#d04870]',
  cupo_bajo: 'bg-[#cf8d00]',
  cupo_disponible: 'bg-[#2f9b65]',
};

const nextDirection = (current: SortDirection, active: boolean): SortDirection =>
  !active ? 'desc' : current === 'desc' ? 'asc' : 'desc';

const sortIndicator = (active: boolean, direction: SortDirection) => {
  if (!active) return '↕';
  return direction === 'desc' ? '↓' : '↑';
};

const compactEntityId = (rawId: string) => {
  const clean = rawId.trim();
  if (!clean) return 's/d';
  if (/^\d+$/.test(clean)) return clean;
  const cMatches = [...clean.matchAll(/(?:^|[-_])(c\d{1,5})(?=$|[-_])/gi)];
  if (cMatches.length) return (cMatches[cMatches.length - 1]?.[1] || '').toLowerCase();
  const numericTailMatch = clean.match(/(?:^|[-_])(\d{1,5})$/);
  if (numericTailMatch?.[1]) return numericTailMatch[1];
  return clean.length > 12 ? `${clean.slice(0, 12)}…` : clean;
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

const combineQuality = (current: BaselineQuality, next: BaselineQuality): BaselineQuality => {
  if (current === 'pre_window' || next === 'pre_window') return 'pre_window';
  if (current === 'post_window' || next === 'post_window') return 'post_window';
  return 'unknown';
};

const formatTimestamp = (iso: string | null) => {
  if (!iso) return 's/d';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 's/d';
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const sumOptional = (acc: number | null, value: number | null) => {
  if (typeof value !== 'number') return acc;
  if (typeof acc !== 'number') return value;
  return acc + value;
};

const capacityMetricsForSubject = (
  subject: SubjectData,
  capacityByCommission: Map<string, VacancyCapacityItem>
): CapacityMetrics => {
  let current = 0;
  let max: number | null = null;
  let initial: number | null = null;
  let quality: BaselineQuality = 'unknown';
  let initialCapturedAt: string | null = null;
  let maxCapturedAt: string | null = null;

  subject.slots.forEach((slot) => {
    if (slot.tipo !== 'prac') return;
    if (typeof slot.vacantes === 'number') current += slot.vacantes;
    const key = `${subject.id}|${slot.id}`;
    const mappedCapacity = capacityByCommission.get(key);
    const maxValue =
      typeof slot.vacantesMaximasObservadas === 'number'
        ? slot.vacantesMaximasObservadas
        : (mappedCapacity?.maxVacantesObserved ?? null);
    const initialValue =
      typeof slot.vacantesInicialesObservadas === 'number'
        ? slot.vacantesInicialesObservadas
        : (mappedCapacity?.initialVacantesObserved ?? null);
    const slotQuality =
      slot.vacantesInicialesQuality || mappedCapacity?.initialBaselineQuality || 'unknown';
    max = sumOptional(max, maxValue);
    initial = sumOptional(initial, initialValue);
    quality = combineQuality(quality, slotQuality);

    const slotInitialCapturedAt = mappedCapacity?.initialCapturedAt || null;
    if (slotInitialCapturedAt) {
      if (!initialCapturedAt || slotInitialCapturedAt < initialCapturedAt) {
        initialCapturedAt = slotInitialCapturedAt;
      }
    }
    const slotMaxCapturedAt = mappedCapacity?.maxCapturedAt || null;
    if (slotMaxCapturedAt) {
      if (!maxCapturedAt || slotMaxCapturedAt > maxCapturedAt) {
        maxCapturedAt = slotMaxCapturedAt;
      }
    }
  });

  return {
    current,
    max,
    initial,
    quality,
    initialCapturedAt,
    maxCapturedAt,
  };
};

const toCatedraVacancyRow = (
  subject: SubjectData,
  materiaId: string,
  capacityByCommission: Map<string, VacancyCapacityItem>
): CatedraVacancyRow => ({
  id: materiaId,
  key: subject.id,
  catedra: catedraFragmentFromLabel(subject.label),
  professor: catedraProfessorFromHeader(subject.header),
  catedraOrder: catedraNumberFromLabel(subject.label),
  metrics: capacityMetricsForSubject(subject, capacityByCommission),
});

const mergeMetrics = (left: CapacityMetrics, right: CapacityMetrics): CapacityMetrics => ({
  current: left.current + right.current,
  max: sumOptional(left.max, right.max),
  initial: sumOptional(left.initial, right.initial),
  quality: combineQuality(left.quality, right.quality),
  initialCapturedAt:
    left.initialCapturedAt && right.initialCapturedAt
      ? left.initialCapturedAt < right.initialCapturedAt
        ? left.initialCapturedAt
        : right.initialCapturedAt
      : left.initialCapturedAt || right.initialCapturedAt || null,
  maxCapturedAt:
    left.maxCapturedAt && right.maxCapturedAt
      ? left.maxCapturedAt > right.maxCapturedAt
        ? left.maxCapturedAt
        : right.maxCapturedAt
      : left.maxCapturedAt || right.maxCapturedAt || null,
});

const toMateriaVacancyRows = (
  subjects: SubjectData[],
  capacityByCommission: Map<string, VacancyCapacityItem>
) => {
  const byMateria = new Map<string, MateriaVacancyRow>();

  subjects.forEach((subject) => {
    const materia = parseMateriaIdentity(subject);
    const groupKey = `${materia.id}::${materia.name}`;
    const catedraRow = toCatedraVacancyRow(subject, materia.id, capacityByCommission);
    const existing = byMateria.get(groupKey);
    if (existing) {
      existing.catedras.push(catedraRow);
      existing.metrics = mergeMetrics(existing.metrics, catedraRow.metrics);
      return;
    }
    byMateria.set(groupKey, {
      id: materia.id,
      key: groupKey,
      name: materia.name,
      catedras: [catedraRow],
      metrics: catedraRow.metrics,
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

const formatCurrentOverMax = (metrics: CapacityMetrics) =>
  typeof metrics.max === 'number' && metrics.max > 0
    ? `${metrics.current} / ${metrics.max}`
    : String(metrics.current);

const formatPercent = (metrics: CapacityMetrics) => {
  if (typeof metrics.max !== 'number' || metrics.max <= 0) return null;
  return `${Math.round((Math.max(0, Math.min(metrics.current, metrics.max)) / metrics.max) * 100)}%`;
};

const VacanciesBarCell = ({ metrics, fallbackMax }: VacanciesCellProps) => {
  const status = vacancyStatusFromCapacity(metrics.current, metrics.max);
  const barWidth =
    typeof metrics.max === 'number' && metrics.max > 0
      ? Math.max(0, Math.min(100, (metrics.current / metrics.max) * 100))
      : fallbackMax > 0
        ? Math.max(0, Math.min(100, (metrics.current / fallbackMax) * 100))
        : 0;
  const percentLabel = formatPercent(metrics);

  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-full min-w-[120px] overflow-hidden rounded-full bg-[#f3e8ef]">
        <div
          className={`h-full rounded-full ${statusToneClass[status]}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="w-10 text-right text-[11px] text-[#7b4a65] tabular-nums">
        {percentLabel || 's/d'}
      </span>
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

const SparklineMini = ({ points, width = 98, height = 26 }: SparklineMiniProps) => {
  if (!points?.length) return <span className="text-[11px] text-[#9c8392]">s/d</span>;
  const normalized = points.length > 1 ? points : [points[0]!, points[0]!];
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
  capacity,
  loading,
}: SubjectVacancyTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedMaterias, setExpandedMaterias] = useState<Set<string>>(() => new Set());
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(null);

  const capacityByCommission = useMemo(
    () =>
      new Map(
        (capacity?.items || []).map((item) => [`${item.subjectId}|${item.commissionId}`, item])
      ),
    [capacity?.items]
  );

  const materiaRows = useMemo(
    () => toMateriaVacancyRows(subjects, capacityByCommission),
    [capacityByCommission, subjects]
  );

  const sortedMaterias = useMemo(() => {
    const direction = sortDirection === 'desc' ? -1 : 1;
    const copy = [...materiaRows];
    copy.sort((a, b) => {
      if (sortKey === 'id') {
        const aNumeric = asNumericId(a.id);
        const bNumeric = asNumericId(b.id);
        if (aNumeric !== null && bNumeric !== null) return (aNumeric - bNumeric) * direction;
        return a.id.localeCompare(b.id, 'es') * direction;
      }
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'es') * direction;
      return (a.metrics.current - b.metrics.current) * direction;
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
  const materiaByKey = useMemo(
    () => new Map(sortedMaterias.map((materia) => [materia.key, materia])),
    [sortedMaterias]
  );
  const globalFallbackMax = useMemo(
    () => displayRows.reduce((acc, entry) => Math.max(acc, entry.row.metrics.current), 0),
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
      if (next.has(materiaKey)) next.delete(materiaKey);
      else next.add(materiaKey);
      return next;
    });
  };

  useEffect(() => {
    if (!selectedDetail) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedDetail(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDetail]);

  return (
    <section className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#4f1237]">Vacantes por materia</h2>
        {loading ? <span className="text-xs text-[#6f3b58]">actualizando…</span> : null}
      </div>

      <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-[#ead9e2]">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[60px]" />
            <col />
            <col className="w-[118px]" />
            <col className="w-[320px]" />
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
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-2 py-2" colSpan={2}>
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('vacancies')}
                >
                  Vacantes (actual / max) {sortIndicator(sortKey === 'vacancies', sortDirection)}
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
                  <td className="px-2 py-2 font-semibold">
                    <span className="block truncate" title={entry.row.id}>
                      {compactEntityId(entry.row.id)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex items-center"
                        onClick={() => toggleMateria(entry.row.key)}
                        aria-expanded={expandedMaterias.has(entry.row.key)}
                        aria-label={
                          expandedMaterias.has(entry.row.key)
                            ? 'Contraer cátedras'
                            : 'Expandir cátedras'
                        }
                      >
                        {expandedMaterias.has(entry.row.key) ? (
                          <ChevronDown size={14} className="text-[#7b4a65]" />
                        ) : (
                          <ChevronRight size={14} className="text-[#7b4a65]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDetail({ kind: 'materia', materia: entry.row })}
                        className="inline-flex items-center gap-1 text-left"
                      >
                        <span className="font-semibold text-[#4f1237] hover:underline">
                          {entry.row.name}
                        </span>
                      </button>
                      <span className="text-[11px] text-[#7b4a65]">
                        ({entry.row.catedras.length} cátedras)
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-[#4f1237]">
                    {formatCurrentOverMax(entry.row.metrics)}
                  </td>
                  <td className="px-2 py-2">
                    <VacanciesBarCell metrics={entry.row.metrics} fallbackMax={globalFallbackMax} />
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
                  <td className="px-2 py-2 text-[#7b4a65]">
                    <span className="block truncate" title={entry.row.id}>
                      {compactEntityId(entry.row.id)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="pl-5">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDetail({
                            kind: 'catedra',
                            catedra: entry.row,
                            materia: materiaByKey.get(entry.parentKey) || null,
                          })
                        }
                        className="block text-left"
                      >
                        <p className="font-medium text-[#5b2e46] hover:underline">
                          {entry.row.catedra}
                        </p>
                      </button>
                      {entry.row.professor ? (
                        <p className="text-[11px] text-[#7b4a65]">
                          Profesor: {entry.row.professor}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-[#4f1237]">
                    {formatCurrentOverMax(entry.row.metrics)}
                  </td>
                  <td className="px-2 py-2">
                    <VacanciesBarCell metrics={entry.row.metrics} fallbackMax={globalFallbackMax} />
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

      {selectedDetail ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="flex-1 bg-black/30"
            onClick={() => setSelectedDetail(null)}
            aria-label="Cerrar detalle"
          />
          <aside className="h-full w-full max-w-[460px] overflow-auto border-l border-[#dbc7d3] bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-[#4f1237]">
                {selectedDetail.kind === 'materia' ? 'Detalle de materia' : 'Detalle de cátedra'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="rounded-md p-1 text-[#7b4a65] hover:bg-[#f4e7ee]"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {selectedDetail.kind === 'materia' ? (
              <div className="mt-3 space-y-3 text-sm text-[#4f1237]">
                <div>
                  <p className="text-xs font-semibold text-[#7b4a65]">ID</p>
                  <p className="font-medium">
                    {compactEntityId(selectedDetail.materia.id)}{' '}
                    <span className="text-xs text-[#7b4a65]">({selectedDetail.materia.id})</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#7b4a65]">Materia</p>
                  <p className="font-semibold">{selectedDetail.materia.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[#ead9e2] bg-[#fcf7fa] p-2">
                    <p className="text-xs text-[#7b4a65]">Actual</p>
                    <p className="text-lg font-black">{selectedDetail.materia.metrics.current}</p>
                  </div>
                  <div className="rounded-lg border border-[#ead9e2] bg-[#fcf7fa] p-2">
                    <p className="text-xs text-[#7b4a65]">Máximo observado</p>
                    <p className="text-lg font-black">
                      {selectedDetail.materia.metrics.max ?? 's/d'}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-[#ead9e2] bg-[#fcf7fa] p-2">
                  <p className="text-xs text-[#7b4a65]">Inicial observado</p>
                  <p className="text-lg font-black">
                    {selectedDetail.materia.metrics.initial ?? 's/d'}
                  </p>
                  <p className="mt-1 text-xs text-[#7b4a65]">
                    {baselineQualityLabel[selectedDetail.materia.metrics.quality]}
                  </p>
                  <p className="text-xs text-[#7b4a65]">
                    Captura inicial:{' '}
                    {formatTimestamp(selectedDetail.materia.metrics.initialCapturedAt)}
                  </p>
                  <p className="text-xs text-[#7b4a65]">
                    Captura máximo: {formatTimestamp(selectedDetail.materia.metrics.maxCapturedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-[#4f1237]">
                <div>
                  <p className="text-xs font-semibold text-[#7b4a65]">Materia</p>
                  <p className="font-semibold">{selectedDetail.materia?.name || 's/d'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#7b4a65]">Cátedra</p>
                  <p className="font-semibold">{selectedDetail.catedra.catedra}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#7b4a65]">Profesor</p>
                  <p>{selectedDetail.catedra.professor || 's/d'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[#ead9e2] bg-[#fcf7fa] p-2">
                    <p className="text-xs text-[#7b4a65]">Actual</p>
                    <p className="text-lg font-black">{selectedDetail.catedra.metrics.current}</p>
                  </div>
                  <div className="rounded-lg border border-[#ead9e2] bg-[#fcf7fa] p-2">
                    <p className="text-xs text-[#7b4a65]">Máximo observado</p>
                    <p className="text-lg font-black">
                      {selectedDetail.catedra.metrics.max ?? 's/d'}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-[#ead9e2] bg-[#fcf7fa] p-2">
                  <p className="text-xs text-[#7b4a65]">Inicial observado</p>
                  <p className="text-lg font-black">
                    {selectedDetail.catedra.metrics.initial ?? 's/d'}
                  </p>
                  <p className="mt-1 text-xs text-[#7b4a65]">
                    {baselineQualityLabel[selectedDetail.catedra.metrics.quality]}
                  </p>
                  <p className="text-xs text-[#7b4a65]">
                    Captura inicial:{' '}
                    {formatTimestamp(selectedDetail.catedra.metrics.initialCapturedAt)}
                  </p>
                  <p className="text-xs text-[#7b4a65]">
                    Captura máximo: {formatTimestamp(selectedDetail.catedra.metrics.maxCapturedAt)}
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
};
