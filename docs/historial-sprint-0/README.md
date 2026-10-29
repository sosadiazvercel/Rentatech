# Sprint 0 de alquiler de tecnología para eventos

Paquete de especificaciones v0.1 · 26 septiembre 2026 · Proyecto 03_ALQUILER_TECH.

El producto es un servicio B2B de alquiler **operado** de tecnología para eventos en Bogotá. Comienza con Meta Quest 2 y Quest 3; una marca amplia permite ampliar el catálogo únicamente después de validar demanda y margen. Este paquete prepara el desarrollo: no contiene una aplicación, integraciones activadas ni cobros reales.

**Resultado:** decisiones de producto y contratos técnicos listos para Sprint 1. El motor comercial de producción sigue condicionado a evidencia real de costos, activos, técnicos, contenido y tratamiento tributario exigida por el Plan Maestro §15. Los valores de simulación no sustituyen esa evidencia.

## Leer en este orden

1. [Autoridad de fuentes y decisiones](docs/00-decisiones.md).
2. [Marca y oferta](docs/01-marca-oferta.md).
3. [Alcance y experiencia del MVP](docs/02-mvp.md).
4. [Arquitectura y repositorio](docs/03-arquitectura.md).
5. [Modelo de datos](docs/04-datos.md).
6. [Pricing v0](docs/05-pricing.md) y [reglas versionadas](config/pricing.v0.sandbox.json).
7. [Disponibilidad y reservas](docs/06-reservas.md).
8. [Contratos de API e integraciones](docs/07-contratos.md).
9. [Backlog y criterios de aceptación](docs/08-backlog.md).
10. [Validaciones para operar y medición](docs/09-operacion-validacion.md).
11. [Instrucción de arranque de Sprint 1](SPRINT-1.md).

## Autoridad

- **PM:** Plan Maestro v1.0, fuente principal; se cita por sección.
- **S0:** decisión o supuesto provisional cerrado en este paquete. Es implementable en el entorno indicado; no es un hecho confirmado por el negocio.
- **DS:** Deep Search, contexto secundario, citado por página. No amplía el alcance del PM.
- **GATE:** dato o evidencia aún inexistente en las fuentes; impide activar la parte comercial correspondiente.
- **POST:** fase posterior; no ejecutar en Sprint 1.

Si aparece una contradicción, aplicar PM > S0 > DS. Registrar cualquier cambio de S0 con motivo, versión y efecto en los criterios de aceptación. No cambiar silenciosamente fórmulas o reservas ya aceptadas.

## Contenido entregado y uso

Los Markdown son la especificación canónica para Codex. El JSON es configuración de simulación, los CSV son plantillas y casos verificables. `.env.example` enumera variables futuras sin credenciales. No hay dependencias instaladas ni comandos de aplicación disponibles todavía. La estructura de implementación prevista está documentada; Sprint 1 creará el proyecto ejecutable.

Las fuentes originales están en `../sources/` y permanecen en modo de referencia. El paquete descargable no necesita copiarlas ni modificarlas; `sources-manifest.json` identifica los originales mediante SHA-256.

## Desarrollo previsto

Stack cerrado: TypeScript, Next.js App Router, PostgreSQL en Supabase, Supabase Auth para personal interno, Wompi Checkout, WhatsApp Business Cloud API y GA4/GTM. Monolito modular con transacciones de base de datos para inventario. Sin cuentas de clientes, microservicios, ERP ni marketplace.

Sprint 1: estructura, páginas públicas, formularios y captura de leads con datos ficticios, esquema inicial y pruebas de acceso. El pricing ejecutable queda después del gate de PM §15. Las versiones exactas de dependencias se fijan en el lockfile al iniciar implementación; no usar actualizaciones automáticas durante el sprint.

Scripts que Sprint 1 debe crear: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `db:reset`. Son requisitos futuros, no instrucciones ejecutables de este paquete.

## Definición de terminado del MVP

Un lead estándar puede cotizar, aceptar condiciones, pagar un anticipo y obtener una reserva única sin sobreventa de equipos ni técnicos. Los casos complejos van a un responsable humano. El CRM registra fuente y cambios; el calendario interno refleja bloqueos. El recorrido completo funciona en sandbox antes del soft launch, y los gates de producción están documentados con evidencia.

## Estado honesto de Sprint 0

Especificaciones preparadas. No se ha verificado disponibilidad de marca/dominio, inventario físico, costos reales, licencias comerciales, situación tributaria ni cuentas de proveedores. No se han ejecutado pruebas de software inexistente. [La matriz de validación](docs/09-operacion-validacion.md) asigna responsables por rol y describe qué permite desbloquear cada evidencia.
