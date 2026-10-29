# RENTATECH — entrega al programador

Fecha: 2026-10-02. Aplicación local de prueba, Sprint 2. No está publicada ni habilitada para operación comercial.

## Cómo empezar

1. Instalar Node.js 22 o 24 y pnpm 10.34.5.
2. Desde la raíz ejecutar `pnpm install --frozen-lockfile`, `pnpm setup:local` y `pnpm db:start`.
3. En otra terminal ejecutar `pnpm dev`. Abrir http://127.0.0.1:3000.
4. Consultar las credenciales generadas en `.local/ACCESO.md`. Cada instalación genera sus propios secretos. Nunca reutilizar accesos de la demostración en producción.
5. Probar `/cotizar` y `/admin/operaciones`. Consultar README para migraciones y pruebas.

Se entrega código y migraciones; no se entrega la base local ni sus registros de prueba. La migración 0003 carga los 29 activos declarados, sin inventar seriales. Los ajustes operativos hechos en la base de una instalación no se sincronizan por Git.

## Documentos vigentes

- `docs/13-sprint2-entrega.md`: funcionamiento actual, tarifas aprobadas, decisiones, pruebas y limitaciones.
- `docs/referencias/sprint2-brief-usuario.md`: alcance solicitado para Sprint 2.
- `docs/12-rentatech-marca-y-contenido.md`: marca, atribuciones de fotografías y pendientes visuales.
- `docs/fuentes/`: Plan Maestro, investigación secundaria y brandbook. Se conserva manifiesto SHA-256.
- `docs/historial-sprint-0/`: paquete original de especificaciones, conservado como antecedente.

El Plan Maestro prevalece sobre Deep Search. Las instrucciones posteriores explícitas del propietario, recogidas en Sprint 2, actualizan decisiones provisionales anteriores. No aplicar las reglas antiguas de personal/precios por encima de las aprobadas para Sprint 2.

## Mapa del proyecto

- `src/app/`: páginas y API Next.js.
- `src/components/`: interfaz y formularios.
- `src/server/`: autenticación, SQL, cotizaciones y reservas.
- `src/lib/rental.ts`: validación y cálculo de tarifas.
- `src/content/success-cases.ts`: tarjetas de casos; añadir enlaces Vimeo reales autorizados. Actualmente son placeholders.
- `supabase/migrations/`: esquema y migraciones ordenadas.
- `scripts/`: preparación y base local; nunca usar reset sobre datos de producción.
- `tests/` y `docs/ci/ci.yml.template`: pruebas y plantilla de CI.
- `public/`: imágenes y recursos; conservar créditos/licencias.

## Pendientes antes del lanzamiento

1. Elegir un hosting que ejecute Next.js/Node y una base PostgreSQL compatible. No basta subir archivos a un hosting estático. El comando start actual escucha en loopback: el programador debe adaptar la interfaz/puerto a su plataforma.
2. Configurar secretos, URL pública, TLS, conexión a base y copias de seguridad en el hosting. No copiar `.env` local. Aplicar migraciones primero en staging y comprobar permisos/extensiones; las migraciones remotas asumen el esquema Auth y roles de Supabase.
3. Configurar y probar Supabase Auth para personal invitado, perfiles y MFA. Producción exige AAL2 y falta completar la pantalla de desafío MFA. No habilitar autenticación local para el sitio público.
4. Aprobar transporte, impuestos, buffers, costos internos, políticas de cancelación/daños y condiciones de anticipo. NULL significa pendiente, no cero. Verificar físicamente inventario, seriales y personal.
5. Revisar derechos del contenido VR y sustituir placeholders por casos reales autorizados. Las fotografías de referencia no prueban inventario ni eventos propios.
6. Aprobar textos legales, privacidad y tratamiento de datos. Revisar límites de solicitudes y proxy de confianza del hosting.
7. Configurar proveedor de correo si se necesita: actualmente marcar enviada no envía correos. No hay pasarela ni cobros automáticos.
8. Tras completar lo anterior, revisar los bloqueos de captación en APP_ENV=production, los avisos de prueba y noindex. Cambiar una variable por sí sola no completa el lanzamiento.
9. Ejecutar lint, typecheck, unitarias, integración y recorridos en staging. Verificar reservas concurrentes, permisos, restauración de backups y acceso administrativo antes de publicar.

El registro previo documenta 15 pruebas unitarias, 21 de integración y 5 de navegador aprobadas. Es evidencia del desarrollo local, no una certificación del futuro hosting. Esta entrega documental no añade funcionalidades.

## Continuar trabajando juntos

Mantener un repositorio privado bajo la cuenta del propietario. El programador y el propietario trabajan sobre copias del mismo repositorio.

Antes de cada cambio, actualizar desde la versión compartida; crear una rama por tarea y entregar una propuesta de cambios (pull request). Revisar y unir a main antes de desplegar. No sobrescribir el trabajo del programador con una carpeta antigua. Si hay cambios locales, preservarlos antes de actualizar.

El propietario puede seguir solicitando ajustes en este proyecto; sincronizar primero el trabajo del programador. El hosting debe desplegar una versión identificada por commit. Guardar credenciales en el gestor de secretos del hosting, nunca en el repositorio.

El ZIP es una entrega inicial y respaldo; no sustituye la sincronización del repositorio. No incluye node_modules, compilaciones, base local, credenciales, logs ni trazas. Instalar dependencias y generar configuración en cada entorno.

## Activar pruebas automáticas en GitHub

La configuración se entrega en `docs/ci/ci.yml.template`, inactiva. Para activarla, el programador debe copiarla a `.github/workflows/ci.yml` y subir ese cambio con una credencial autorizada para workflows. La autorización utilizada para la entrega permite repositorios pero no crear workflows. Las pruebas locales siguen disponibles.
