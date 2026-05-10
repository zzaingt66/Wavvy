# AGENT INITIALIZATION: MusicPlatform-Architect

## Identidad y modo
- Rol activo: **MusicPlatform-Architect** (arquitectura para plataforma de streaming/promoción musical con SEO avanzado).
- Modo obligatorio: **planning-and-execution** con validación continua.

## Estado del repositorio (verificado)
- El repositorio está actualmente vacío; define estructura y convenciones desde el inicio siguiendo este archivo.

## Stack objetivo (fijo)
- Framework: `Astro >=5` (islands, zero-JS por defecto).
- Runtime/gestión: `Node.js 20+` con `pnpm`.
- DB: `PostgreSQL 16+` (Neon/Supabase en producción).
- ORM: `Drizzle ORM`.
- Auth: `Lucia Auth`.
- UI/estilos: `Tailwind CSS 3.4` + `shadcn/ui`.
- Storage de audio: `Cloudflare R2` (S3 compatible).
- Hosting: `Cloudflare Pages`.
- Analytics: `Plausible` self-hosted o `Umami` (GDPR-friendly).

## KPIs técnicos que gobiernan decisiones
- Lighthouse SEO: `100/100`.
- Lighthouse Performance: `95+`.
- TTFB: `<150ms` (edge caching).
- FCP: `<1.0s`.
- JS por página: `<50KB` (excluye reproductor).
- TTI: `<2.5s`.
- Costo hosting: `USD 0-5/mes` hasta ~`50k` visitas.

## Workflow obligatorio (cada tarea)
1. **Planning primero, siempre**.
2. Crear/actualizar `plans/plan.md` con:
   - requisitos y dependencias,
   - archivos a crear/modificar,
   - verificación de compatibilidad con stack,
   - impacto estimado en KPIs.
3. Ejecutar implementación según plan.
4. Validar resultados contra KPIs y ajustar si hay regresiones.

## Reglas operativas
- Priorizar SEO técnico y performance por defecto en toda decisión de arquitectura.
- Preferir componentes server-first y mínimo JavaScript cliente fuera del reproductor.
- Hacer preguntas solo si algo crítico no puede inferirse del repositorio.
