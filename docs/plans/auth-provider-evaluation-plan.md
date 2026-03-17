# Plan: autenticacion social + email (free-first)

## Contexto

`uba-psi-scheduler` hoy corre con `Next.js static export` en Cloudflare Pages y usa Convex como backend de datos.
Necesitamos evaluar opciones para agregar:

- Sign up / sign in con email.
- Social login con proveedores tipicos (Google, Facebook, X/Twitter y otros recomendables).
- Prioridad de costo: comenzar gratis.

Fecha de evaluacion: **2026-03-16**.

## Decision actualizada (2026-03-16)

- Provider elegido: **Clerk**.
- Alcance MVP de login: **Google + Email/Password**.
- Facebook/X quedan para una fase posterior.
- Estado tecnico actual: migracion aplicada a Next runtime + middleware de Clerk (se removio `output: 'export'`).

## Requisitos

### Funcionales

- Registro e inicio de sesion con email y password.
- OAuth social con Google.
- Recuperacion de password y verificacion de email.
- Soportar linking de cuentas (mismo email entre social + password).

### Tecnicos

- Compatible con despliegue actual (estatico + Convex).
- Integracion simple con frontend React/Next.
- Posibilidad de usar identidad en Convex (`ctx.auth`) para datos por usuario.

### Negocio

- Empezar en plan gratuito.
- Evitar lock-in innecesario.
- Mantener baja complejidad operativa.

## Que providers sociales conviene considerar ademas de Google/Facebook/X

- `GitHub`: friccion baja para usuarios tecnicos.
- `Apple`: util para usuarios iOS/macOS y compliance en ecosistema Apple.
- `Microsoft`: util para cuentas institucionales.

Recomendacion de MVP (actual): **Google + Email/Password**.
`Facebook`, `X/Twitter`, `GitHub`, `Apple` y `Microsoft` quedan como providers opcionales de fase 2.

## Opciones evaluadas

### 1) Clerk + Convex (recomendada para entregar rapido)

- Cobertura auth:
  - Email/password: si.
  - Social: si (incluye Google, Facebook y X/Twitter v2).
- Free-first:
  - Plan Hobby gratis con **50,000 MRU por app**.
  - En free: **hasta 3 social connections** (alcanza Google + Facebook + X/Twitter).
- Encaje tecnico:
  - Convex lo recomienda para Next.js (client-side y server-side).
  - Muy buena DX y componentes prearmados.
- Riesgos:
  - Dependencia en SaaS externo.
  - Si luego crece el numero de social providers, puede requerir upgrade.

### 2) Auth0 + Convex (alternativa madura)

- Cobertura auth:
  - Email/password: si (database connection).
  - Social: si (incluye Google/Facebook/X y muchas mas).
- Free-first:
  - Free plan con **hasta 25,000 MAU**.
- Encaje tecnico:
  - Convex tiene integracion oficial (`convex/react-auth0`).
  - Funciona bien para enfoque client-only.
- Riesgos:
  - Menor cuota free que Clerk.
  - Consola y configuracion mas pesada para casos simples.

### 3) Convex Auth (in-app en Convex, beta)

- Cobertura auth:
  - Email/password: si.
  - Magic links/OTP: si.
  - OAuth: si (Google y otros).
- Free-first:
  - Sin costo adicional de proveedor de identidad (solo uso Convex + email delivery si aplica).
- Encaje tecnico:
  - Diseñado para apps React client-side servidas por CDN (como este caso).
- Riesgos:
  - Feature en **beta**.
  - Soporte Next.js SSR/server components aun en evolucion.

### 4) Supabase Auth

- Cobertura auth:
  - Email/password: si.
  - Social: si (Google, Facebook, X/Twitter, etc.).
- Free-first:
  - **50,000 MAU** en plan Free, luego cobro por MAU.
- Encaje tecnico:
  - SDK cliente simple.
  - Pero agregaria un segundo backend de identidad paralelo a Convex.
- Riesgos:
  - Complejidad extra para conectar identidad Supabase con autorizacion en Convex.

### 5) Firebase Authentication

- Cobertura auth:
  - Email/password: si.
  - Social: si (Google, Facebook, Twitter/X, GitHub, Apple, etc.).
- Free-first:
  - Con Identity Platform: **50,000 MAU sin costo** (Blaze).
  - En Spark: limite de **3,000 DAU** para proveedores tier 1.
- Encaje tecnico:
  - SDK maduro y client-side.
  - Igual que Supabase, suma backend de identidad adicional al stack actual.
- Riesgos:
  - Integracion con Convex requiere capa de mapeo/autorizacion adicional.

### 6) WorkOS AuthKit + Convex

- Cobertura auth:
  - Email/password: si.
  - Social: si, con fuerte foco en Google/Microsoft/GitHub/Apple (ademas de otros proveedores OAuth empresariales).
- Free-first:
  - User Management/AuthKit gratis hasta **1 millon de usuarios activos**.
- Encaje tecnico:
  - Convex tiene integracion oficial con WorkOS AuthKit (incluye auto-configuracion de entornos).
  - WorkOS tambien soporta integracion client-only para apps React servidas por CDN (compatible con enfoque estatico).
- Riesgos:
  - Si el requisito estricto es **Facebook + X/Twitter** como first-class providers, WorkOS no es la opcion mas directa hoy.
  - Puede requerir ajustar el set de social login del MVP (ej. Google + Apple + GitHub/Microsoft).

## Comparativa corta (para este proyecto)

| Opcion          |   Free tier inicial | Google/Facebook/X            | Email sign up/sign in | Encaje con stack actual | Riesgo principal            |
| --------------- | ------------------: | ---------------------------- | --------------------- | ----------------------- | --------------------------- |
| Clerk + Convex  |             50k MRU | Si (X v2)                    | Si                    | Alto                    | lock-in / limites por plan  |
| Auth0 + Convex  |             25k MAU | Si                           | Si                    | Alto                    | mas complejidad de setup    |
| Convex Auth     |    dentro de Convex | Parcial/segun provider OAuth | Si                    | Medio-Alto              | beta                        |
| Supabase Auth   |             50k MAU | Si                           | Si                    | Medio                   | doble backend auth + Convex |
| Firebase Auth   |     50k MAU (Blaze) | Si                           | Si                    | Medio                   | doble backend auth + Convex |
| WorkOS + Convex | 1M usuarios activos | Parcial (no foco en FB/X)    | Si                    | Alto                    | desalineacion con FB/X      |

## Recomendacion

### Recomendacion principal: Clerk + Convex

Por equilibrio entre:

- Rapidez de implementacion.
- Cobertura del alcance pedido (Google + Email).
- Free tier amplio.
- Integracion ya documentada por Convex para Next.js.

### Plan B (si prioridad es minimizar dependencia externa): Convex Auth

Usar solo si aceptamos riesgo de beta y hacemos un spike tecnico previo.

### Cuando elegir WorkOS

Elegir WorkOS si:

- queremos maximizar free tier (1M usuarios activos),
- mantenemos integracion cercana al ecosistema Convex,
- y aceptamos un set social centrado en Google/Microsoft/GitHub/Apple en lugar de Facebook/X.

## Plan de implementacion (fases)

### Fase 0 - Decision y spike (1-2 dias)

- Proveedor final: `Clerk`.
- Hacer PoC de:
  - login Google,
  - signup email/password,
  - lectura de identidad desde Convex.
- Validar callback URLs en preview/prod.

**Criterio de salida**: demo funcional end-to-end en entorno dev.

### Fase 1 - Base de identidad en app (2-3 dias)

- Integrar provider en layout raiz y client provider.
- Crear guard para rutas privadas (p. ej. futuras vistas con persistencia por usuario).
- Crear tabla/perfil de usuario en Convex (sin datos sensibles de password).

**Criterio de salida**: usuario autenticado tiene registro consistente en Convex.

### Fase 2 - Flujos UX de auth (2-4 dias)

- Pantallas: sign up, sign in, sign out, reset password.
- Agregar social button de Google y flujo email/password.
- Manejo de errores comunes (email ya usado, cuenta bloqueada, callback invalido).

**Criterio de salida**: suite de flujos manuales completos en desktop y mobile.

### Fase 3 - Seguridad y observabilidad (1-2 dias)

- Verificacion de email obligatoria para alta por password.
- Rate-limits/anti-abuse segun capacidades del proveedor.
- Eventos analytics de embudo auth (inicio, exito, error por paso).

**Criterio de salida**: tablero minimo de conversion y errores de auth.

### Fase 4 - Rollout gradual (1 dia)

- Activar auth en subset de funcionalidades primero (persistencia de horarios por usuario).
- Monitorear tasa de error login y drop-off.
- Habilitar providers adicionales (Apple/Microsoft/X) segun demanda real.

**Criterio de salida**: auth estable en produccion con metricas base.

## Riesgos y mitigaciones

- Cambios de alcance social despues del MVP (agregar Facebook/X).
  - Mitigacion: desacoplar provider UI de la logica de perfil/usuario en Convex.
- Doble backend de identidad (si Supabase/Firebase).
  - Mitigacion: priorizar integraciones nativas con Convex.
- Scope creep (MFA, orgs, RBAC avanzado demasiado pronto).
  - Mitigacion: separar MVP de auth basica vs features enterprise.

## Decision sugerida

- Avanzar con **Clerk + Convex** para MVP (Google + Email).
- Definir desde inicio la interfaz interna `AuthUser` para no acoplar toda la app a un vendor.
- Revisar costo/uso al llegar al 60-70% del free tier.

## Fuentes oficiales consultadas

- Convex Auth y estado beta: https://docs.convex.dev/auth/convex-auth
- Convex auth (opciones e integraciones): https://docs.convex.dev/auth
- Convex Next.js auth guidance: https://docs.convex.dev/client/nextjs/app-router/
- Convex pricing: https://www.convex.dev/pricing
- Clerk pricing: https://clerk.com/pricing
- Clerk social connections: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/overview
- Clerk custom email/password flow: https://clerk.com/docs/guides/development/custom-flows/authentication/email-password
- Auth0 pricing: https://auth0.com/pricing
- Auth0 database connections (email/password): https://auth0.com/docs/authenticate/database-connections
- Supabase social login overview: https://supabase.com/docs/guides/auth/social-login
- Supabase Google/Facebook/X providers:
  - https://supabase.com/docs/guides/auth/social-login/auth-google
  - https://supabase.com/docs/guides/auth/social-login/auth-facebook
  - https://supabase.com/docs/guides/auth/social-login/auth-twitter
- Supabase password auth: https://supabase.com/docs/guides/auth/passwords
- Supabase MAU pricing details: https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users
- Firebase Authentication overview: https://firebase.google.com/docs/auth
- Firebase email/password auth: https://firebase.google.com/docs/auth/web/password-auth
- Firebase pricing (Auth section): https://firebase.google.com/pricing
- Google Identity Platform pricing (Firebase Auth): https://cloud.google.com/identity-platform/pricing
- Firebase Auth limits (Spark DAU): https://firebase.google.com/docs/auth/limits
- Auth.js (open source): https://authjs.dev/
- Auth.js providers (Google/Facebook/Twitter):
  - https://authjs.dev/getting-started/providers/google
  - https://authjs.dev/getting-started/providers/facebook
  - https://authjs.dev/getting-started/providers/twitter
- Auth.js email/magic links: https://authjs.dev/getting-started/authentication/email
- WorkOS AuthKit social login: https://workos.com/docs/authkit/social-login
- WorkOS Email + Password: https://workos.com/docs/authkit/email-password
- WorkOS pricing: https://workos.com/pricing
- WorkOS integrations catalog: https://workos.com/docs/integrations
- Convex + WorkOS AuthKit: https://docs.convex.dev/auth/authkit/
