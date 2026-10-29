# Contratos de API e integraciones

## Convenciones

Base `/api/v1`. JSON UTF-8, ISO-8601 con offset para fechas; servidor convierte a UTC y valida horario Bogotá. Respuesta de error `{ "error": { "code": "...", "message": "...", "fields": {} }, "requestId": "..." }`. Códigos: 400 formato, 401 sin sesión/token, 403 rol, 404 no existe, 409 estado/capacidad/conflicto de idempotencia, 422 datos de negocio inválidos, 429 límite, 503 proveedor/gate no disponible. `manual_review` es respuesta de negocio 200/201, no error 500.

Mutaciones de reserva y pago exigen `Idempotency-Key`; persistir hash de request y resultado, únicos por operación/actor. Autorización no deriva de conocer un UUID: enlaces públicos requieren token secreto o sesión corta derivada del token. URLs/token deben quedar fuera de telemetría y del referrer a terceros.

## Endpoints del MVP

| Método y ruta | Entrada / autorización | Salida y efecto |
|---|---|---|
| GET `/equipment` | Público | Solo Quest 2/3 y datos de presentación, nunca seriales/costos |
| POST `/leads` | Contacto, request de ocho grupos, consentimiento y atribución; público limitado | leadId y token de continuación; upsert contacto + nueva oportunidad idempotente |
| POST `/availability` | eventStart, eventEnd, equipmentCode, quantity, city, venue y contentChoice | status, reasonCodes, quoteEligible, checkedAt; ninguna asignación |
| POST `/quotes` | leadId + token continuación, request validado | quoteId, token URL, snapshot, expiresAt o manual_review; cálculo servidor |
| GET `/quotes/[token]` | Enlace secreto | Snapshot y vigencia, nunca costos/margen internos |
| GET `/quotes/[token]/pdf` | Mismo token | PDF exacto del snapshot, sin indexación |
| POST `/quotes/[token]/accept` | policyVersion, accepted=true, Idempotency-Key | bookingId, bookingToken, holdExpiresAt; hold transaccional |
| POST `/bookings/[token]/checkout` | Hold vigente, Idempotency-Key | referencia y configuración/URL Checkout Wompi; monto servidor |
| GET `/bookings/[token]` | Token | Estado comercial, estado de pago resumido, monto saldo y fecha; sin seriales |
| POST `/bookings/[token]/cancel-hold` | Token y clave idempotente | Cancela solo holding sin anticipo; otros estados → revisión |
| GET `/admin/leads` y `/admin/bookings` | Sesión staff | Paginación, filtros por fecha/estado/propietario |
| PATCH `/admin/leads/[id]` | Staff | Etapa, propietario, motivo y próxima acción auditados |
| GET `/admin/calendar` | Staff; from/to, máximo 31 días | Ocupación de equipos y técnicos, holds y conflictos |
| POST `/admin/blocks` | Admin; recurso, intervalo, motivo | Bloqueo si no entra en conflicto; nunca desplaza reserva |
| POST `/admin/bookings/[id]/commands` | Staff según acción | prepare/dispatch/return; admin cancel/reschedule/resolve-payment; cada comando valida transición |
| POST `/admin/inventory` y PATCH `/admin/inventory/[id]` | Admin | Alta/inspección/estado; no activar sin datos reales en producción |
| POST `/admin/technicians` y POST `/admin/technician-windows` | Admin | Personal y ventanas; sin disponibilidad implícita |
| POST `/admin/pricing-versions` | Admin | Nueva versión con evidencia; prohíbe mutar reglas usadas |

El CRM asistido usa nuevas versiones de quote; un admin no debe saltar gate de impuestos, derechos o inventario por editar un precio. El saldo puede cobrarse con link Wompi creado por admin y registrado como payment purpose=balance; no automatizar recobro de tarjetas.

## Ejemplo canónico de solicitud estándar

```json
{
  "city": "Bogota",
  "eventStart": "2026-10-15T10:00:00-05:00",
  "eventEnd": "2026-10-15T14:00:00-05:00",
  "equipmentCode": "QUEST3",
  "quantity": 5,
  "attendees": 100,
  "contentChoice": "client_authorized",
  "venue": {
    "name": "Recinto de prueba",
    "address": "Direccion ficticia solo sandbox",
    "indoor": true,
    "urbanCoverageVerified": true,
    "accessAndPowerConfirmed": true
  }
}
```

`urbanCoverageVerified` es resultado de validación administrativa o regla de cobertura aprobada, no una afirmación confiable del navegador. En producción sin regla de cobertura validada, lugar nuevo → revisión humana. El contenido solo llega a `client_authorized` tras evidencia; el cliente envía `client_provided` inicialmente y personal confirma autorización. Si aún no está verificada, se puede mostrar estimación orientativa, nunca aceptar checkout.

Salida de quote estándar sandbox: quantity=5, technicianCount=1, backupCount=1, subtotalCop=2010000, taxCop=381900, totalCop=2391900, depositCop=1195950, balanceCop=1195950, pricingVersion=0.1.0-sandbox, status=issued. Lead y contacto no aparecen completos en la URL.

Reason codes mínimos: OUTSIDE_CITY, OUTSIDE_HOURS, SHORT_NOTICE, MULTIDAY, QUANTITY_REVIEW, MIXED_MODELS, CONTENT_UNVERIFIED, VENUE_UNVERIFIED, INSUFFICIENT_UNITS, INSUFFICIENT_TECHNICIANS, MARGIN_BELOW_GATE, COMMERCIAL_CONFIG_UNAPPROVED, QUOTE_EXPIRED, RESOURCE_CONFLICT. UI traduce a texto útil; no muestra stack traces.

## Wompi

`POST /api/webhooks/wompi`: ruta separada por entorno. Verificar checksum con los valores indicados en `signature.properties`, timestamp y secreto de eventos, siguiendo [Wompi Eventos Colombia](https://docs.wompi.co/docs/colombia/eventos/). El secreto de eventos no es la llave privada. La firma no da autoridad a campos que no cubre; contrastar transacción servidor a servidor con la referencia local.

Persistir evento válido antes de responder 2xx. Si no se puede persistir, responder 5xx; firma inválida → rechazo sin mutación. Dedupe con hash de environment + transaction ID + estado + timestamp + checksum; además, efectos de aplicación únicos por payment. Procesamiento transaccional independiente de la entrega de mensajes. Si proveedor no responde, dejar pendiente para reintento y conciliación.

Wompi maneja `amount_in_cents`; convertir COP enteros multiplicando por 100 exactamente y comprobar límites seguros. La comisión no se suma al monto que paga el cliente. No aceptar `APPROVED` desde una query string o mensaje de WhatsApp.

## WhatsApp FAQ y handoff

Alcance MVP: responder oferta, cobertura, operación obligatoria y proceso con FAQ aprobada; pedir datos faltantes y enlazar cotizador. Consultar disponibilidad a través del mismo servicio. No crear reserva desde texto ni inventar precio; mandar link de quote emitida. No revelar información de otro contacto por compartir número de reserva.

Handoff obligatorio ante descuento, producción/licencias, reclamación, cambio, pago en revisión, falta de información o solicitud expresa de persona. Al transferir, detener respuestas de IA para esa oportunidad hasta que el operador reabra el modo automático. CRM registra canal y responsable. API oficial requiere cuenta y credenciales reales; no automatizar una sesión personal de WhatsApp.

No programar mensajes de seguimiento/recordatorio en S1. El contrato del proveedor, ventanas y plantillas de envío se validan con documentación oficial al implementar el incremento correspondiente; no convertir una hipótesis de mensajes libres en requisito de negocio.

## SEO y accesibilidad

Canonical propio por página, sitemap solo de rutas públicas, robots sin admin/cotizaciones/reservas, metadata y Open Graph, LocalBusiness/Organization con datos reales. No publicar dirección o valoración inventada. El diseño SSR del catálogo no debe depender de ejecutar el cotizador. Consentimientos separados y controles con labels, teclado y mensajes de validación asociados.
