# Plan: Legacy Ingest + Capacity (`cupoInicial`/`cupoMax`) + UI relativa

## Resumen

- Objetivo: recuperar histórico legacy de vacantes, modelar capacidad por comisión y usarla para mostrar cupo relativo en analytics y calendario.
- Orden operativo: **1) ingestar legacy faltante** -> **2) recomputar capacity** -> **3) aplicar UI relativa**.
- Decisiones cerradas:
  - `%` y barras contra `cupoMaxObservado`.
  - tabla dedicada para capacity (lean).
  - sin reset de DB.
  - estado relativo: `sin_cupo=0`, `cupo_bajo<=20%`, `disponible>20%`.

## Modelo de datos (Convex, lean)

### Nueva tabla `vacancyCapacity`

Una fila por comisión (`careerSlug + period + subjectId + commissionId`).

Campos:

- `careerSlug`
- `period`
- `subjectId`
- `commissionId`
- `initialVacantesObserved: number | null`
- `initialSourceRunId: string | null`
- `initialBaselineQuality: 'pre_window' | 'post_window' | 'unknown'`
- `maxVacantesObserved: number | null`
- `maxSourceRunId: string | null`

Índices:

- `by_career_period` (`careerSlug`, `period`)
- `by_commission` (`careerSlug`, `period`, `subjectId`, `commissionId`)

Notas:

- no guardar `subjectLabel` (se resuelve por join con `offerSubjects`).
- no guardar `initialObservedAt/maxObservedAt` (se derivan de `sourceRunId -> vacancyProbeRuns.capturedAt`).
- no guardar `updatedAt`.

## Semántica de capacidad

- `initialVacantesObserved`: primer valor observado históricamente (no necesariamente pre-apertura).
- `maxVacantesObserved`: mayor valor observado históricamente (cubre casos de ampliación de cupo).
- `initialBaselineQuality`:
  - `pre_window` si el primer observado es previo a apertura.
  - `post_window` si cae después de apertura.
  - `unknown` si no hay ventana o timestamps válidos.

## Ingesta y recomputación

### 1) Ingesta legacy primero

Extender `scripts/backfill-vacancies-from-git.ts` para soportar:

- schema v2 (`slots`),
- schema legacy (`teoricos`, `seminarios`, `comisiones` pipeado con vacantes en `parts[8]`).

Reusar parseo de `scripts/migrate-subject-schema-v2.ts` para normalizar a v2 antes de `POST /ingestOfferProbe`.

### 2) Recompute de capacity sobre dataset completo

Agregar mutación admin `recomputeVacancyCapacity`:

- fuentes: `vacancyCurrent`, `vacancyChanges`, `vacancyProbeRuns`, `enrollmentWindows`.
- reconstrucción por comisión:
  - estado inicial observado,
  - máximo observado,
  - sourceRunIds correspondientes,
  - baseline quality.
- upsert en `vacancyCapacity`.

## APIs/Interfaces públicas

### Nuevo endpoint HTTP

`POST /getVacancyCapacity`

Request:

- `careerSlug`
- `period`
- `includeProbeTimes?: boolean`

Response base:

- `items[]` con comisión + initial/max + sourceRunIds + baselineQuality.

Si `includeProbeTimes=true`:

- agregar `initialCapturedAt?: string | null`
- agregar `maxCapturedAt?: string | null`

### Cliente frontend

Agregar en `src/lib/offer-api.ts`:

- `getVacancyCapacity(careerSlug, period, includeProbeTimes?)`

## UI scope de esta fase

### Analytics (`Vacantes por materia`)

- barra y % relativos a `sum(max)` por materia/cátedra.
- labels `actual/max` + `%`.
- drawer:
  - `initial`, `max`,
  - quality (`pre/post/unknown`),
  - timestamps derivados.

### Calendario (cards de comisión)

- línea de cupo relativa `actual/max`.
- estado por regla relativa (20%).
- fallback a regla absoluta si falta `max`.

## Reglas de estado (relativas)

- `sin_datos`: vacantes actuales `null`.
- `sin_cupo`: vacantes actuales `0`.
- `cupo_bajo`: `actual/max <= 0.20`.
- `cupo_disponible`: `actual/max > 0.20`.

## Testing

### Unit

- parse legacy (`parts[8]` vacantes).
- cálculo `initial/max`.
- clasificación relativa con bordes (`0`, `20%`, `>20%`, `null`).

### Integración

- backfill legacy ingesta commits antes omitidos.
- `recomputeVacancyCapacity` idempotente y consistente.
- `getVacancyCapacity` sin `subjectLabel` persistido.

### E2E

- analytics table muestra `actual/max` correcto.
- calendario usa capacidad relativa.
- drawer muestra `initial/max` y baseline quality.

## Criterios de aceptación

- histórico legacy ya cargado en DB.
- `vacancyCapacity` completo para período/carrera activa.
- analytics + calendario usan `cupoMaxObservado` como denominador.
- sin reset de DB.

## Proyección de tamaño (ciclo actual)

- estado observado: ~7.6k `vacancyChanges` en ~21h.
- proyección lineal aproximada: ~128k cambios en 15 días.
- estimación: debería entrar en este ciclo sin política de retención inmediata.

## Further work

- política de retención/compactación de `vacancyChanges`.
- exploración WebArchive/cachés externas para aproximar mejor “pre-apertura real”.
