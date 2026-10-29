# Entrega y verificación de Sprint 1

27 septiembre 2026. Entorno local de desarrollo, sin publicación ni cobros.

## Resultado

Base ejecutable y recorrido solicitud → PostgreSQL → CRM → seguimiento implementados. Las seis páginas de oferta, el formulario, el acceso y las pantallas internas están disponibles en el servidor local. Las fuentes de negocio conservan sus hashes SHA-256 originales.

## Evidencia ejecutada

| Verificación | Resultado |
|---|---|
| Build Next.js | Correcto; rutas públicas y administrativas compiladas |
| TypeScript | Sin errores |
| ESLint | Sin errores en la última ejecución |
| Pruebas unitarias | 15 aprobadas: validación, entradas inyectadas, revisión asistida y sesión local |
| Integración PostgreSQL 17.10 | 8 aprobadas: migración desde vacío, RLS/permisos, FK/CHECK, solapamientos, idempotencia concurrente, contacto/atribución, auditoría y motivo de pérdida obligatorio |
| Navegador Playwright con Chrome local | 4 aprobadas: rutas a 360 px, selección de equipo, formulario → CRM → nota → logout, permisos/origen y captura visual |
| Auditoría de dependencias productivas | Sin vulnerabilidades conocidas reportadas por pnpm audit en esta ejecución |
| Revisión visual | Home en escritorio y móvil; formulario móvil sin desbordamiento observado |
| Secretos y datos locales | `.env`, `.local/ACCESO.md`, base y dependencias excluidos de Git |

Total: 27 pruebas automatizadas aprobadas. La captura visual no reemplaza las pruebas funcionales. Los screenshots y trazas se conservan como salidas locales ignoradas por Git.

Durante QA se corrigieron nombres accesibles de los selectores del formulario/CRM y la ambigüedad del mensaje de error frente al anunciador de rutas de Next. Se agregó una segunda migración para que SQL no acepte motivos de pérdida nulos ni seriales reales vacíos al marcar unidades listas. La base local se reinició tras una interrupción de la sesión.

## Historias entregadas

| Historia | Entrega |
|---|---|
| S1-01 | Repo local, versiones exactas, lockfile, scripts, env y CI configurado |
| S1-02 | Modelo inicial, migraciones y restricciones verificadas en PostgreSQL real |
| S1-03 | Sesión/roles comprobados localmente; adaptador Supabase preparado, servicio remoto pendiente de cuenta real |
| S1-04 | Home, VR, Quest 2/3 y las dos landing pages |
| S1-05 | Ocho grupos, validación servidor/cliente, soporte obligatorio y excepciones asistidas |
| S1-06 | Captación idempotente, contacto deduplicado, CRM, notas y atribución |
| S1-07 | Estados de ejemplo internos y distinción explícita entre solicitud, estimación y reserva |
| S1-08 | Verificación, README reproducible y handoff documentado |

## Límites y pendientes

- CI está escrito; no se ejecutó en GitHub porque no existe remoto. La verificación informada se realizó localmente.
- Supabase hospedado e invitaciones reales no se probaron sin cuenta/credenciales. El acceso de producción exige MFA, cuyo desafío de interfaz aún no está implementado. No habilitar producción con el login local.
- No se probaron Wompi, WhatsApp, Ads, generación de cotización ni confirmación de reserva porque pertenecen a S2 o fases posteriores y no están implementados.
- G01–G07 siguen pendientes. No usar cifras de simulación como tarifa comercial.
- ESLint 9 es una dependencia de desarrollo fuera de soporte, retenida por compatibilidad de plugins; revisar su actualización como se registra en documento 10.
- El servidor local y PostgreSQL deben estar activos para probar. Si la aplicación o la sesión se cierran, reiniciar según README; no existe servicio de arranque del sistema.

## Siguiente paso

Revisión del prototipo por el usuario. Completar costos, inventario serializado, personal, cobertura, contenido y políticas antes del motor de pricing de S2. Este sprint no autoriza publicación, contratación de servicios ni inicio de fases posteriores.
