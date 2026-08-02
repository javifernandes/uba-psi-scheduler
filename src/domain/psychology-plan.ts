export type PlanCycle = 'general' | 'professional';
export type CourseProgressStatus = 'in_progress' | 'regularized' | 'approved';

export type PlanCourse = {
  id: string;
  name: string;
  cycle: PlanCycle;
  annual?: boolean;
  prerequisites: string[];
  position: { x: number; y: number };
};

export const PSYCHOLOGY_PLAN_VERSION = 'psychology-1985@2026';

export const PSYCHOLOGY_PLAN_COURSES: PlanCourse[] = [
  {
    id: 'ppb',
    name: 'Procesos Psicológicos Básicos',
    cycle: 'general',
    prerequisites: [],
    position: { x: 40, y: 70 },
  },
  {
    id: 'estadistica',
    name: 'Estadística',
    cycle: 'general',
    prerequisites: [],
    position: { x: 40, y: 180 },
  },
  {
    id: 'psicologia-social',
    name: 'Psicología Social',
    cycle: 'general',
    prerequisites: [],
    position: { x: 40, y: 290 },
  },
  {
    id: 'freud',
    name: 'Psicoanálisis: Freud',
    cycle: 'general',
    annual: true,
    prerequisites: [],
    position: { x: 40, y: 400 },
  },
  {
    id: 'aprendizaje',
    name: 'Psicología del Aprendizaje',
    cycle: 'general',
    prerequisites: [],
    position: { x: 40, y: 510 },
  },
  {
    id: 'neurofisiologia',
    name: 'Neurofisiología',
    cycle: 'general',
    prerequisites: [],
    position: { x: 40, y: 620 },
  },
  {
    id: 'historia',
    name: 'Historia de la Psicología',
    cycle: 'general',
    prerequisites: ['ppb'],
    position: { x: 330, y: 70 },
  },
  {
    id: 'metodologia',
    name: 'Metodología de la Investigación',
    cycle: 'general',
    prerequisites: ['ppb', 'estadistica'],
    position: { x: 330, y: 180 },
  },
  {
    id: 'salud-publica',
    name: 'Salud Pública y Salud Mental',
    cycle: 'general',
    prerequisites: ['metodologia', 'psicologia-social'],
    position: { x: 330, y: 290 },
  },
  {
    id: 'grupos',
    name: 'Teoría y Técnica de Grupos',
    cycle: 'general',
    prerequisites: ['psicologia-social', 'freud'],
    position: { x: 330, y: 400 },
  },
  {
    id: 'ninez',
    name: 'Psicología del Desarrollo: Niñez',
    cycle: 'general',
    prerequisites: ['freud', 'aprendizaje'],
    position: { x: 330, y: 510 },
  },
  {
    id: 'adolescencia',
    name: 'Psicología del Desarrollo: Adolescencia',
    cycle: 'general',
    prerequisites: ['freud', 'aprendizaje'],
    position: { x: 330, y: 620 },
  },
  {
    id: 'psicopatologia',
    name: 'Psicopatología',
    cycle: 'general',
    annual: true,
    prerequisites: ['neurofisiologia', 'adolescencia'],
    position: { x: 330, y: 730 },
  },
  {
    id: 'diagnostico-1',
    name: 'Exploración y Diagnóstico Psicológico I',
    cycle: 'general',
    prerequisites: ['psicopatologia'],
    position: { x: 620, y: 680 },
  },
  {
    id: 'diagnostico-2',
    name: 'Exploración y Diagnóstico Psicológico II',
    cycle: 'general',
    prerequisites: ['psicopatologia'],
    position: { x: 620, y: 790 },
  },
  {
    id: 'etica',
    name: 'Ética, Deontología y DDHH',
    cycle: 'professional',
    prerequisites: ['historia', 'psicologia-social'],
    position: { x: 920, y: 70 },
  },
  {
    id: 'organizacional',
    name: 'Psicología Organizacional e Institucional',
    cycle: 'professional',
    prerequisites: ['metodologia', 'grupos'],
    position: { x: 920, y: 180 },
  },
  {
    id: 'educacional',
    name: 'Psicología Educacional',
    cycle: 'professional',
    prerequisites: ['salud-publica', 'grupos', 'adolescencia'],
    position: { x: 920, y: 290 },
  },
  {
    id: 'trabajo',
    name: 'Psicología del Trabajo',
    cycle: 'professional',
    prerequisites: ['salud-publica', 'grupos'],
    position: { x: 920, y: 400 },
  },
  {
    id: 'clinica-1',
    name: 'Psicología Clínica y Psicoterapias I',
    cycle: 'professional',
    prerequisites: ['psicopatologia', 'diagnostico-1', 'diagnostico-2'],
    position: { x: 920, y: 510 },
  },
  {
    id: 'juridica',
    name: 'Psicología Jurídica',
    cycle: 'professional',
    prerequisites: ['psicopatologia', 'diagnostico-2'],
    position: { x: 920, y: 620 },
  },
  {
    id: 'clinica-2',
    name: 'Psicología Clínica y Psicoterapias II',
    cycle: 'professional',
    prerequisites: ['psicopatologia', 'diagnostico-1', 'diagnostico-2'],
    position: { x: 920, y: 730 },
  },
];

export const planCourseById = Object.fromEntries(
  PSYCHOLOGY_PLAN_COURSES.map((course) => [course.id, course])
) as Record<string, PlanCourse>;

export const satisfiedCourseIds = (progress: Record<string, CourseProgressStatus>) =>
  new Set(
    Object.entries(progress)
      .filter(([, status]) => status === 'regularized' || status === 'approved')
      .map(([courseId]) => courseId)
  );

export const missingPrerequisites = (
  course: PlanCourse,
  progress: Record<string, CourseProgressStatus>
) => {
  const satisfied = satisfiedCourseIds(progress);
  return course.prerequisites.filter((courseId) => !satisfied.has(courseId));
};

export const courseIsAvailable = (
  course: PlanCourse,
  progress: Record<string, CourseProgressStatus>
) => !progress[course.id] && missingPrerequisites(course, progress).length === 0;

export const planProgressPercent = (progress: Record<string, CourseProgressStatus>) => {
  const approved = Object.values(progress).filter((status) => status === 'approved').length;
  return Math.round((approved / PSYCHOLOGY_PLAN_COURSES.length) * 100);
};
