'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Check, Circle, Clock3, LockKeyhole } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { AuthNav } from '@/components/auth/auth-nav';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import {
  PSYCHOLOGY_PLAN_COURSES,
  PSYCHOLOGY_PLAN_VERSION,
  courseIsAvailable,
  missingPrerequisites,
  planCourseById,
  planProgressPercent,
  type CourseProgressStatus,
  type PlanCourse,
} from '@/domain/psychology-plan';

const statusLabels: Record<CourseProgressStatus, string> = {
  in_progress: 'Cursando',
  regularized: 'Regularizada',
  approved: 'Aprobada',
};

const statusStyles: Record<CourseProgressStatus, string> = {
  in_progress:
    'border-sky-400 bg-sky-50 text-sky-800 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-200',
  regularized:
    'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200',
  approved: 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400',
};

const courseStateClass = (
  course: PlanCourse,
  progress: Record<string, CourseProgressStatus>,
  selected: boolean,
  related: boolean
) => {
  const status = progress[course.id];
  if (selected)
    return 'border-[#861f5c] bg-[#861f5c] text-white ring-4 ring-[#ead0df] dark:border-fuchsia-300 dark:bg-[#861f5c] dark:ring-[#5d2949]';
  if (status) return statusStyles[status];
  if (courseIsAvailable(course, progress))
    return 'border-[#c68baa] bg-white text-[#4f1237] dark:border-[#c68baa] dark:bg-zinc-900 dark:text-zinc-100';
  if (related)
    return 'border-[#b98aa4] bg-[#f8edf3] text-[#4f1237] dark:border-[#b98aa4] dark:bg-[#382230] dark:text-zinc-100';
  return 'border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
};

const CARD_WIDTH = 210;
const CARD_HEIGHT = 68;

const edgePath = (source: PlanCourse, target: PlanCourse, targetIndex: number) => {
  const x1 = source.position.x + CARD_WIDTH;
  const y1 = source.position.y + CARD_HEIGHT / 2;
  const x2 = target.position.x - 7;
  const entryOffset = (targetIndex - (target.prerequisites.length - 1) / 2) * 12;
  const y2 = target.position.y + CARD_HEIGHT / 2 + entryOffset;
  const midX = x1 + (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
};

export const PlanPageClient = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const records = useQuery(api.planProgress.listCurrentUserProgress, {
    planVersion: PSYCHOLOGY_PLAN_VERSION,
  });
  const setCourseProgress = useMutation(api.planProgress.setCurrentUserCourseProgress);
  const [selectedId, setSelectedId] = useState('ppb');
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useLocalStorageState<
    Record<string, CourseProgressStatus>
  >({
    key: `uba_psi_plan_progress:${PSYCHOLOGY_PLAN_VERSION}:${user?.id || 'local'}`,
    defaultValue: {},
    enabled: isLoaded && Boolean(isSignedIn),
    rehydrateToken: user?.id,
  });

  const progress = useMemo(
    () => ({
      ...(Object.fromEntries(
        (records || []).map((record) => [record.courseId, record.status])
      ) as Record<string, CourseProgressStatus>),
      ...localProgress,
    }),
    [localProgress, records]
  );
  const selected = planCourseById[selectedId] || PSYCHOLOGY_PLAN_COURSES[0];
  const dependentIds = PSYCHOLOGY_PLAN_COURSES.filter((course) =>
    course.prerequisites.includes(selected.id)
  ).map((course) => course.id);
  const relatedIds = new Set([...selected.prerequisites, ...dependentIds]);
  const approvedCount = Object.values(progress).filter((status) => status === 'approved').length;
  const availableCount = PSYCHOLOGY_PLAN_COURSES.filter((course) =>
    courseIsAvailable(course, progress)
  ).length;

  const updateStatus = async (courseId: string, status: CourseProgressStatus | null) => {
    if (!isSignedIn || savingCourseId) return;
    setSavingCourseId(courseId);
    setSaveNotice(null);
    setLocalProgress((current) => {
      const next = { ...current };
      if (status) next[courseId] = status;
      else delete next[courseId];
      return next;
    });
    if (!isConvexAuthenticated) {
      setSavingCourseId(null);
      return;
    }
    try {
      await setCourseProgress({
        planVersion: PSYCHOLOGY_PLAN_VERSION,
        courseId,
        status,
      });
      setSaveNotice('Progreso guardado.');
    } catch (error) {
      console.warn('[PlanPage] Convex progress sync failed; keeping local progress', error);
      setSaveNotice('Guardado en este navegador; no se pudo sincronizar con tu cuenta.');
    } finally {
      setSavingCourseId(null);
    }
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),#f8f2f5] px-3 py-4 text-[#351126] dark:bg-[radial-gradient(circle_at_0%_0%,#3a1b2c_0%,transparent_35%),#0f0b12] dark:text-zinc-100 md:px-5">
      <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
        <header className="rounded-2xl bg-[#861f5c] px-4 py-3 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                Licenciatura en Psicología
              </p>
              <h1 className="text-xl font-black">Plan de carrera</h1>
            </div>
            <nav className="flex items-center gap-2 text-xs" aria-label="Secciones de la oferta">
              <Link
                href="/oferta"
                className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15"
              >
                Horarios
              </Link>
              <span className="rounded-md border border-white/30 bg-white/25 px-3 py-1.5 font-semibold">
                Plan
              </span>
              <Link
                href="/oferta/analytics"
                className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15"
              >
                Analíticas
              </Link>
              <AuthNav mode="scheduler" />
            </nav>
          </div>
        </header>

        <section className="rounded-2xl border border-[#e4cfdb] bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div>
              <h2 className="font-bold">Tu recorrido</h2>
              <p className="text-xs text-[#785069] dark:text-zinc-400">
                Materias obligatorias y correlatividades inmediatas.
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                {approvedCount} aprobadas
              </span>
              <span className="rounded-full bg-[#f3e2eb] px-3 py-1 font-semibold text-[#6b204b]">
                {availableCount} disponibles
              </span>
            </div>
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-[#861f5c] transition-all dark:bg-fuchsia-400"
                  style={{ width: `${planProgressPercent(progress)}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-xs font-semibold text-[#6f3b58] dark:text-zinc-300">
                {planProgressPercent(progress)}%
              </span>
            </div>
            {isLoaded && !isSignedIn && (
              <span className="text-xs text-[#785069] dark:text-zinc-400">
                Iniciá sesión para marcar materias.
              </span>
            )}
            {saveNotice && isSignedIn && (
              <span className="text-xs text-[#785069] dark:text-zinc-400" role="status">
                {saveNotice}
              </span>
            )}
          </div>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-[#e4cfdb] bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="relative mx-auto h-[900px] w-[1180px] min-w-[1180px] overflow-hidden rounded-xl bg-[linear-gradient(90deg,#faf7f9_0%,#faf7f9_74%,#f5edf2_74%,#f5edf2_100%)] dark:bg-[linear-gradient(90deg,#211820_0%,#211820_74%,#2b1d27_74%,#2b1d27_100%)]">
            <div className="absolute left-10 top-4 text-xs font-black uppercase tracking-[0.18em] text-[#7e5069] dark:text-zinc-300">
              Ciclo de Formación General
            </div>
            <div className="absolute left-[920px] top-4 text-xs font-black uppercase tracking-[0.18em] text-[#7e5069] dark:text-zinc-300">
              Formación Profesional
            </div>
            <svg
              className="absolute inset-0 h-[900px] w-[1180px]"
              viewBox="0 0 1180 900"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="arrow"
                  markerUnits="userSpaceOnUse"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5.5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
                </marker>
              </defs>
              {PSYCHOLOGY_PLAN_COURSES.flatMap((target) =>
                target.prerequisites.map((sourceId, targetIndex) => {
                  const source = planCourseById[sourceId];
                  const highlighted = selected.id === target.id || selected.id === source.id;
                  return (
                    <path
                      key={`${sourceId}-${target.id}`}
                      d={edgePath(source, target, targetIndex)}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={highlighted ? 2 : 1.15}
                      markerEnd="url(#arrow)"
                      className={
                        highlighted
                          ? 'text-[#861f5c] dark:text-fuchsia-300'
                          : 'text-[#c8acbb] dark:text-zinc-600'
                      }
                    />
                  );
                })
              )}
            </svg>
            {PSYCHOLOGY_PLAN_COURSES.map((course) => {
              const status = progress[course.id];
              const missing = missingPrerequisites(course, progress);
              return (
                <div
                  key={course.id}
                  onMouseEnter={() => setSelectedId(course.id)}
                  style={{
                    left: course.position.x,
                    top: course.position.y,
                    width: 210,
                    height: CARD_HEIGHT,
                  }}
                  className={`absolute z-10 rounded-xl border-2 px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${courseStateClass(course, progress, selected.id === course.id, relatedIds.has(course.id))}`}
                >
                  {course.annual && (
                    <span className="absolute right-2 top-2 rounded-full bg-current/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide">
                      Anual
                    </span>
                  )}
                  <span
                    className={`line-clamp-2 text-xs font-black leading-tight ${course.annual ? 'pr-10' : ''}`}
                  >
                    {course.name}
                  </span>
                  {isLoaded && isSignedIn ? (
                    <select
                      aria-label={`Estado de ${course.name}`}
                      value={status || ''}
                      disabled={savingCourseId === course.id}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation();
                        void updateStatus(
                          course.id,
                          (event.target.value || null) as CourseProgressStatus | null
                        );
                      }}
                      className="absolute bottom-1.5 left-2 right-2 w-[calc(100%-1rem)] rounded border border-current bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-[#5b173f] outline-none dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">
                        {missing.length
                          ? `${missing.length} pendiente${missing.length > 1 ? 's' : ''}`
                          : 'Disponible'}
                      </option>
                      <option value="in_progress">Cursando</option>
                      <option value="regularized">Regularizada</option>
                      <option value="approved">Aprobada</option>
                    </select>
                  ) : (
                    <span className="absolute bottom-2 left-3 flex items-center gap-1 text-[10px] font-semibold opacity-80">
                      {status === 'approved' ? (
                        <Check size={11} />
                      ) : status === 'in_progress' ? (
                        <Clock3 size={11} />
                      ) : missing.length ? (
                        <LockKeyhole size={11} />
                      ) : (
                        <Circle size={11} />
                      )}
                      {status
                        ? statusLabels[status]
                        : missing.length
                          ? `${missing.length} pendiente${missing.length > 1 ? 's' : ''}`
                          : 'Disponible'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <p className="px-2 text-xs text-[#785069] dark:text-zinc-400">
          Prototipo basado en el Plan de Estudios 1985 publicado por la Facultad. Por ahora excluye
          CBC, electivas, idiomas, prácticas y tesis.
        </p>
      </section>
    </main>
  );
};
