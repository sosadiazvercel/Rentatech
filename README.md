# RENTATECH · Sprint 2

Aplicación local de prueba para alquiler operado de tecnología. Sprint 2 añade inventario individual, disponibilidad por fecha, tarifas versionadas, cotizador, cotizaciones históricas y reservas con asignación transaccional de equipos y técnicos. Pagos manuales registrados, sin pasarela ni movimientos de dinero.

**Estado y guía del Sprint 2:** [entrega, decisiones, pruebas y pendientes](docs/13-sprint2-entrega.md). La verificación anterior de Sprint 1 se conserva como historial en docs/11-verificacion-sprint1.md.

**Probar:** `/cotizar` y `/admin/operaciones`. Configurar transporte, impuestos y buffers; crear técnicos antes de confirmar. No usar datos personales reales mientras se mantenga la demostración local.

## Marca y contenido

Identidad actual: **RENTATECH**, según el Brandbook v2.0 suministrado por el propietario. Los documentos originales de Sprint 0 conservan NexoKit como decisión histórica provisional; la marca pública vigente es RENTATECH. Los identificadores internos de base de datos no se migran por un cambio visual.

Se aplicaron los siete comentarios de revisión: navegación, cobertura, opciones de contenido, fotografía principal, énfasis en realidad virtual, sección preparada para casos y explicación de usos. [Detalle, fuentes y material pendiente](docs/12-rentatech-marca-y-contenido.md).

## Inicio local

Requisitos: Node.js 22 o 24 y pnpm 10.34.5. La implementación se verificó localmente con Node 24.18.0; la plantilla de CI usa Node 22 (pendiente de activar; ver ENTREGA.md). Este ajuste de compatibilidad respecto a Sprint 0 no cambia el negocio.

```sh
pnpm install --frozen-lockfile
pnpm setup:local
pnpm db:start
```

Dejar la base funcionando. En otra terminal, dentro de esta carpeta:

```sh
pnpm dev
```

Abrir `http://127.0.0.1:3000`. Completar el cotizador con datos ficticios. Tras enviarlo, entrar a Operaciones en `/admin`. El acceso usa el correo del administrador y la clave acordada. El script nunca sobrescribe `.env` existente ni imprime secretos.

`db:start` ejecuta PostgreSQL 17.10 en loopback, puerto 55432, persistente en `.local/postgres`; aplica migraciones y crea fixtures marcados y aplica la carga de los 29 activos declarados en Sprint 2. Ctrl+C lo detiene. No instala un servicio de Windows ni modifica bases externas. El wrapper `embedded-postgres` tiene versión beta y se usa solo en desarrollo, nunca en producción.

Alternativa para verificar build:

```sh
pnpm build
pnpm start
```

Usar **127.0.0.1**, igual que APP_BASE_URL. La protección de origen rechaza dominios distintos. No ejecutar dos servidores web en el mismo puerto.

## Base de Sprint 1 conservada

- Home, catálogo VR, Quest 2, Quest 3, landing de eventos y landing Bogotá. Diseño adaptable a 360 px, sin reseñas ni fotografías ficticias.
- Formulario validado en navegador y servidor; soporte presencial obligatorio, solicitudes especiales a revisión y consentimientos separados.
- Persistencia PostgreSQL: contacto deduplicado por correo y una oportunidad por evento. Reenvío con misma clave no duplica; misma clave y datos diferentes devuelve conflicto. Una nueva solicitud no sobrescribe identidad de un contacto existente.
- CRM protegido: listado paginado, filtro de etapa, detalle, responsable, valor estimado manual, próxima acción, motivo de pérdida y notas con auditoría.
- Login del administrador con credenciales basicas y sesiones guardadas en PostgreSQL/Supabase.
- Migración del modelo S0 completo, FK/CHECK, exclusión de intervalos, RLS sin acceso directo público, snapshots y registros históricos protegidos.
- Tarjetas internas de estados de ejemplo: estimación, revisión y confirmación claramente ficticia. Las pantallas demo históricas siguen rotuladas. El sitio público ya utiliza el motor de Sprint 2 y tarifas configurables.
- Configuración y CI, pruebas de validación, autenticación, integridad SQL y recorrido en navegador.

## Comandos

| Comando | Uso |
|---|---|
| `pnpm setup:local` | Crear configuración local y archivo privado de acceso |
| `pnpm dev` | Servidor de desarrollo local |
| `pnpm build` / `pnpm start` | Compilar y ejecutar build |
| `pnpm lint` / `pnpm typecheck` | Calidad estática |
| `pnpm test` | Reglas de entrada y sesión |
| `pnpm test:integration` | Migración e integridad en **nexokit_test** y **rentatech_sprint2_test** locales aisladas |
| `pnpm test:e2e` | Recorrido navegador; requiere base activa y build |
| `pnpm db:start` | PostgreSQL de desarrollo |
| `pnpm db:migrate --local` | Migraciones con bootstrap de Auth ficticio en local |
| `pnpm db:migrate` | Migraciones sobre PostgreSQL/Supabase configurado, sin Auth ficticio |
| `pnpm db:reset --confirm-local-reset` | Borrar únicamente esquema public de nexokit_dev/test local y resembrar |

Las pruebas de integración reconstruyen `nexokit_test` y `rentatech_sprint2_test`, nunca `nexokit_dev` ni una base remota. Playwright usa Chrome local en Windows si existe; en otros entornos instalar Chromium con `pnpm exec playwright install chromium`. Los screenshots y trazas están excluidos de Git.

## Supabase y seguridad

El login usa `admin@sosadiazeventos.com` y la contraseña acordada, validada en servidor mediante scrypt, sin Supabase Auth. Funciona en local y producción. `BASIC_ADMIN_EMAIL` y `BASIC_ADMIN_PASSWORD` son overrides opcionales: dejarlos vacíos o sin configurar para usar el acceso acordado. `AUTH_MODE` y `LOCAL_*` no controlan este login.

En Vercel configurar `DATABASE_URL` con la conexión **Transaction pooler** de Supabase (puerto 6543), `MIGRATION_DATABASE_URL` con la conexión directa o **Session pooler** (puerto 5432), `DATABASE_SSL=true` y `APP_BASE_URL=https://<dominio-del-sitio>`. Aplicar las variables a Production, Preview y Development según corresponda y volver a desplegar. `COMMERCIAL_ENABLED` es un interruptor opcional: ausente o `true` acepta cotizaciones; solo `false` las deshabilita. `pnpm build` aplica las migraciones usando `MIGRATION_DATABASE_URL`; `0007_basic_staff_auth.sql` crea el administrador y la tabla de sesiones sin requerir usuarios en Supabase Auth. No ejecutar `setup:local`, `db:start` ni migraciones con `--local` contra Supabase. Si se cambia el correo mediante un override, también debe existir un perfil administrador activo con ese `login_email`.

Las sesiones duran 8 horas y se guardan en la base compartida para funcionar entre instancias de Vercel. La cookie es HttpOnly y SameSite Strict; en producción también es Secure y requiere HTTPS. Cerrar sesión revoca el token. Los datos del administrador, productos, operaciones y solicitudes conservan su persistencia actual en Supabase.

Las consultas SQL se hacen únicamente en servidor con credencial privilegiada privada. Por ello cada página y API administrativa verifica sesión y rol antes de acceder a datos. RLS y revocación de permisos impiden acceso directo de anon/authenticated a tablas. Una credencial SQL filtrada es crítica: usar gestor de secretos y rotación antes de producción.

El acceso del administrador no requiere configurar Supabase Auth, invitaciones ni MFA. La base de datos de Supabase debe estar accesible y tener las migraciones aplicadas.

La recepción de cotizaciones está habilitada por defecto en local y Vercel; `COMMERCIAL_ENABLED=false` funciona como apagado de emergencia. El servidor solo confirma una solicitud después de guardarla en PostgreSQL/Supabase; una falla de base de datos devuelve error y nunca muestra una cotización local ficticia como guardada. El correo es opcional: si Resend falla, la cotización permanece guardada y el envío queda registrado para revisión. El sitio integra Google Analytics (`G-MWNJE326EW`) y Microsoft Clarity (`z5hkz2pozt`) en el layout global. No se reciben pagos. Los límites de envío/login se guardan en DB.

## Entrega al programador

Empezar por [ENTREGA.md](ENTREGA.md): instalación, documentos vigentes, pendientes de producción y colaboración. El motor de cotizaciones y reservas de Sprint 2 ya está implementado; los documentos de Sprint 0 y Sprint 1 se conservan como antecedentes.

Las fuentes originales se incluyen como copias de referencia en `docs/fuentes/`. No modificar esos originales. La copia de Sprint 0 está en `docs/historial-sprint-0/`.
