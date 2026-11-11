# Ajustes de plataforma — noviembre de 2026

El cotizador exige NIT / Cédula, permite seleccionar el prefijo telefónico (Colombia +57 por defecto), muestra las jornadas seleccionadas y usa «Continuar». La confirmación reemplaza el formulario y el encabezado inicial; si el proveedor no acepta el correo, informa que está pendiente.

Las solicitudes muestran días de alquiler, los datos actuales y el contexto del alquiler. El seguimiento incluye Nueva solicitud, Cotizado, Perdido, Por pagar, Confirmado y Finalizado, con indicador de progreso y controles según la etapa.

- Cotizado: adjuntar PDF (máximo 5 MB). Se guarda una copia privada y se envía al cliente solicitando su aceptación por respuesta al correo.
- Por pagar: registrar la aprobación recibida, conservar o reemplazar el PDF final e indicar un enlace HTTPS de pago. El correo contiene el documento, el resumen y las instrucciones.
- Confirmado: registrar la referencia del pago verificado y marcar la comprobación. Se valida disponibilidad y se reservan equipos, o se conserva la reserva existente de Operaciones.
- Finalizado: cerrar el alquiler, liberar equipos y enviar agradecimiento.
- Perdido: cerrar el seguimiento sin generar correo. Si ya estaba confirmado, liberar la reserva; los reembolsos pendientes se conservan para revisión del equipo.

La aceptación del cliente y la validación del pago son registradas por el equipo. No hay cobros automáticos ni lectura automática de respuestas de correo.

## Correos y configuración

El resumen inicial del cliente y la notificación administrativa tienen destinatarios, asuntos y contenidos separados. Jorge recibe el detalle completo en `jorgesosadiaz@sosadiazbros.com`.

Variables del servidor:

```dotenv
RESEND_API_KEY=<clave del proveedor>
EMAIL_FROM=<remitente verificado>
EMAIL_NOTIFICATION_TO=jorgesosadiaz@sosadiazbros.com
EMAIL_REPLY_TO=jorgesosadiaz@sosadiazbros.com
```

Los correos se registran dentro de la transacción y se envían después de confirmar los cambios. Guardar notas o volver a adjuntar el mismo PDF no genera otro correo. Una transición o un PDF/enlace nuevo genera una notificación independiente. Los reintentos conservan contenido y clave de idempotencia. Los envíos sin confirmación durante más de 23 horas requieren revisar el proveedor antes de repetirlos. El detalle de la solicitud permite consultar estados y reintentar pendientes.

Los PDF se almacenan en Postgres con acceso únicamente desde rutas autenticadas del equipo; no se publican URLs de descarga anónimas.

## Despliegue y comprobaciones

`npm run build` aplica las migraciones, incluida `0008_lead_workflow.sql`, y compila. En el entorno publicado se deben mantener las variables anteriores y el acceso a la base de datos. El trabajo local no publica la aplicación.

Verificación automatizada:

```sh
npm test
npm run test:integration
npx playwright test tests/e2e/quote-reference.spec.ts tests/e2e/platform-adjustments.spec.ts
```

Las pruebas de integración usan bases locales independientes. Los correos se prueban con respuestas simuladas del proveedor; la prueba de confirmación en navegador intercepta el envío de la solicitud para evitar correos reales.
