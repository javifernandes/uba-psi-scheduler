# Plan de producto: Vacantes, propuestas y analítica

Fecha: 2026-03-14

## Objetivo

Transformar el dato de vacantes (actualizado cada 30 minutos) en valor directo para el alumno: mejores decisiones de inscripción, menos errores, alertas útiles y visualizaciones accionables.

## Épicas priorizadas

### 1) UX inmediata de vacantes en el scheduler (Now)

- Mostrar vacantes por comisión en el selector (badge a la derecha).
- Mostrar vacantes totales visibles junto al resumen de comisiones.
- Mostrar vacantes agregadas por cátedra en el selector de Materia/Cátedra.
- Resaltar visualmente estados críticos: sin cupo, cupo bajo, cupo cómodo.
- Definir copy consistente: `Vac X`, `Vac 0`, `Vac s/d`.

### 2) Consistencia de inscripción y guardrails (Now)

- Al intentar seleccionar una comisión sin cupo, bloquear inscripción o pedir confirmación explícita.
- Advertencia contextual cuando una propuesta incluye comisiones sin vacantes.
- Reglas de integridad al guardar propuestas: marcar propuestas inválidas por cupo.
- Telemetría de eventos clave: intentos sobre comisión sin cupo, abandonos y cambios de comisión.

### 3) Propuestas de inscripción persistidas (Next)

- Modelo explícito `Propuesta` con múltiples escenarios por alumno.
- Campos base: nombre, materia/cátedra, comisión objetivo, prioridad, notas, estado.
- Estados sugeridos: `vigente`, `en_riesgo`, `sin_cupo`, `inscripta`, `descartada`.
- Vista comparativa entre propuestas para tomar decisiones rápidas.
- Versionado liviano de propuesta para ver cambios recientes.

### 4) Alertas proactivas de cupo (Next)

- Alertas cuando una propuesta queda sin cupo o cae por debajo de un umbral.
- Alertas de oportunidad: vuelve a abrirse cupo en una comisión observada.
- Canales: primero in-app; luego email/push como extensión.
- Anti-ruido: debounce y deduplicación por ventana temporal.
- Preferencias por usuario: frecuencia, horario silencioso, severidad.

### 5) Analytics histórica de vacantes (Later)

- Heatmap de consumo de vacantes por día/hora durante inscripción.
- Cortes por carrera, materia (unificando cátedras), cátedra y sede.
- Evolución temporal de una comisión puntual (serie de tiempo).
- Ranking de comisiones por velocidad de agotamiento.
- Indicadores de volatilidad: cupos que suben y bajan frecuentemente.

### 6) Predicción de agotamiento (Later)

- Estimar tiempo esperado a `vacantes = 0` por comisión.
- Mostrar nivel de confianza y banda de incertidumbre.
- Explicar la predicción con variables simples (pendiente reciente, hora pico, volatilidad).
- Recalcular en cada actualización de scraper y guardar snapshots.
- UX de riesgo: `alto`, `medio`, `bajo` para priorizar acción del alumno.

### 7) Calidad de datos y observabilidad (Transversal)

- Validaciones automáticas del scraper (schema y outliers de vacantes).
- Detección de cambios bruscos sospechosos (saltos anómalos).
- Trazabilidad por timestamp de captura y fuente.
- Dashboard técnico de salud del pipeline y frescura de datos.

## Experiencias de usuario objetivo

- Como alumno, quiero ver de un vistazo qué comisiones tienen cupo para no perder tiempo.
- Como alumno, quiero guardar varias propuestas y saber cuál está en riesgo.
- Como alumno, quiero recibir una alerta antes de quedarme sin opciones.
- Como coordinador de oferta, quiero entender patrones de consumo de vacantes para ajustar planificación.

## Roadmap sugerido

- Iteración 1: UX inmediata + guardrails de consistencia.
- Iteración 2: propuestas persistidas + estados de riesgo.
- Iteración 3: alertas in-app y luego canales externos.
- Iteración 4: analytics histórica + predicción inicial.

## Definiciones para alinear implementación

- Vacantes conocidas: suma de valores numéricos reportados por comisión.
- Vacantes `s/d`: comisión con dato faltante o no informado.
- Riesgo de propuesta: función de vacantes actuales + tendencia reciente.
