# UBA Psi Scheduler - Migration Plan

## Objetivo
Extraer la app `bookops/web/src/app/uba/psico` a un repo independiente, mantenerla liviana y desplegarla en modo estático con un flujo simple de `push -> preview -> prod`.

## Estado Inicial
- Nuevo esqueleto en `uba-psi-scheduler/`.
- Código del scheduler copiado desde BookOps.
- Theme dark/light y botón flotante preservados con implementación mínima.
- Configuración orientada a static export (`next.config.mjs` con `output: 'export'`).

## Fase 1 - Paridad funcional local
1. Instalar dependencias y correr la app local.
2. Validar rutas:
   - `/`
   - `/uba/psicologia/oferta/lic-psicologia/scheduler`
3. Validar:
   - carga de materias
   - filtros
   - conflictos
   - guardado en localStorage
   - theme toggle
4. Ajustar cualquier import/estilo roto.

Criterio de done:
- La app funciona local sin depender de BookOps.

## Fase 2 - Limpieza de repo
1. Eliminar archivos que no aporten al MVP (por ejemplo páginas legacy si no se usan).
2. Revisar tests copiados y dejar solo los relevantes al scheduler.
3. Definir estructura estable:
   - `src/app/uba/psicologia/oferta/lic-psicologia/...`
   - `scripts/` (scraper)
4. Documentar comandos y flujo de actualización de datos.

Criterio de done:
- Repo entendible, acotado, sin dependencias sobrantes.

## Fase 3 - Deploy estático en Cloudflare
1. Crear repo remoto `uba-psi-scheduler`.
2. Conectar Cloudflare Pages al repo.
3. Configurar:
   - Build command: `npm run build`
   - Output directory: `out`
   - Production branch: `main`
4. Verificar deploy de producción.

Criterio de done:
- URL pública estable funcionando con build estático.

## Fase 4 - Previews y pruebas en paralelo
1. Mantener `main` como producción.
2. Trabajar en branches cortas (`feat/*`, `fix/*`).
3. Cada branch/PR genera preview deployment automático en Cloudflare.
4. Opcional: branch `staging` como entorno de integración continua.

Convención sugerida:
- `main`: prod
- `staging`: integración manual
- `feat/*`: preview efímera por PR

## Fase 5 - Evolución a Next SSR + persistencia
1. Cuando haya necesidad real de backend:
   - migrar de export estático a runtime en Workers (OpenNext)
   - mantener UI y rutas
2. Añadir persistencia por etapas:
   - primero autenticación
   - luego entidades de alumno / cursada
3. Mantener doble entorno (`preview` vs `prod`) para migraciones seguras.

Criterio de done:
- Backend habilitado sin interrumpir producción actual.

## Riesgos y mitigación
- Riesgo: divergencia de datos de oferta.
  - Mitigación: script de scraping y proceso documentado de refresh.
- Riesgo: picos de tráfico.
  - Mitigación: modo estático + CDN edge (Cloudflare).
- Riesgo: scope creep temprano (auth/DB antes de tiempo).
  - Mitigación: no introducir backend hasta validar necesidad.
