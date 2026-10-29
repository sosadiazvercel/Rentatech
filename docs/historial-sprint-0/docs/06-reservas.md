# Disponibilidad y reglas de reserva

## Qué consume capacidad

S0: usar intervalos semiabiertos `[inicio - 2h, fin + 2h)`. Equipos de uso, respaldos y técnicos se asignan durante ese intervalo. Un recurso ocupado hasta las 16:00 puede empezar otro bloqueo a las 16:00; no antes. Buffer no añade horas cobradas al cliente.

Ejemplo: evento 10:00–14:00 bloquea 08:00–16:00. Otro evento 16:00–20:00 bloquea 14:00–22:00 y entra en conflicto si usa los mismos recursos. Sí puede usar recursos distintos si alcanzan.

Solo unidades `ready`, inspeccionadas y no reservadas/bloqueadas en ese intervalo. Cada reserva q necesita q + ceil(q/5) unidades del mismo modelo. Los respaldos son físicos y exclusivos, nunca disponibles para otro cliente. Técnicos: ceil(q/5), activos, con ventana laboral que cubra todo el intervalo y sin solapamientos. Ausencia de roster confirmado equivale a cero capacidad operativa.

La disponibilidad vendible es el mayor q dentro de 2–10 que satisface simultáneamente unidades y técnicos. No sumar Quest 2 y Quest 3 ni ofrecer sustitución sin aceptación. La consulta informa `available`, `unavailable` o `manual_review`; no expone seriales ni identidad de técnicos.

Con 14 unidades listas de un modelo, una reserva de 10 consume 12 y deja 2; esas 2 no permiten otra venta estándar mínima de 2 porque faltaría respaldo. Dos reservas simultáneas de 5 consumen 6+6 y dos técnicos: son posibles si están disponibles. No limitar artificialmente a un evento global, pero nunca inferir personal ilimitado.

## Bloqueos

- Cotización emitida: no bloquea.
- Hold de checkout: bloquea unidades y técnicos 20 minutos desde creación.
- Confirmed / in_service: bloquea hasta fin del intervalo o cierre efectivo si hay retraso.
- Maintenance / manual: bloqueo interno de recursos con razón y actor.
- Expired / cancelled: libera asignaciones, preserva historial.

El vencimiento del hold se comunica en pantalla; no se renueva con recargas. Desactivar holds vencidos dentro de cada operación de asignación bajo lock. La tarea periódica ayuda a mantener pantalla limpia, pero no determina corrección.

## Algoritmo transaccional requerido

1. Validar caso estándar, cotización vigente/no sustituida, aceptación de política y gate comercial.
2. Bloquear fila de lead y quote para impedir checkout paralelo de distintas versiones. Repetir request_key devuelve resultado previo; misma clave con body distinto → 409.
3. Bloquear filas de equipos/técnicos candidatos en orden determinista por ID, limpiar asignaciones holding vencidas y recalcular disponibilidad.
4. Seleccionar q+b unidades y t técnicos con ventanas completas. Insertar booking holding y asignaciones activas en una transacción. Restricciones de exclusión son la última barrera contra carreras.
5. Commit antes de llamar al proveedor. Crear referencia de pago ligada al booking; ante fallo de inicialización marcar intento error y liberar hold si no existe otro intento en curso, con comando idempotente.
6. Si hay conflicto de serialización/exclusión, reintentar internamente máximo dos veces con lectura nueva; si persiste devolver 409. Nunca sobreasignar para «resolver» el conflicto.

Un segundo intento de pago dentro del hold usa la misma reserva y fecha de expiración, nueva reference; no extiende el hold. Al vencer, no aceptar un nuevo checkout sobre el booking expirado: pedir nueva cotización/versionado. Un pago tardío ya iniciado sí sigue el procedimiento siguiente.

## Transiciones de booking

| Origen | Evento | Destino | Efecto |
|---|---|---|---|
| Sin reserva | Aceptación válida y capacidad | holding | Crea bloqueo y vencimiento |
| holding | Anticipo verificado antes de vencer | confirmed | Convierte bloqueo temporal a firme, sin duplicarlo |
| holding | Tiempo agotado sin pago verificado | expired | Libera recursos |
| holding | Abandono explícito | cancelled | Libera recursos; no equivale a reembolso |
| holding/expired | Pago aprobado tardío y capacidad recuperable | confirmed | Reasigna atómicamente todo; requiere mismo alcance aceptado |
| holding/expired | Pago aprobado pero sin capacidad o datos no coinciden | payment_review | No prometer reserva; tarea urgente humana |
| confirmed | Inicio autorizado del evento | in_service | Requiere saldo conciliado o excepción documentada por admin |
| in_service | Devolución revisada y cierre operativo | completed | Registra evidencia; libera al cumplir buffer y revisión |
| confirmed | Cancelación aceptada por admin | cancelled | Libera recursos; devolución de dinero por revisión separada |
| payment_review | Responsable logra capacidad y valida pago/condiciones | confirmed | Asignación completa bajo mismas restricciones |
| payment_review | Responsable acuerda devolución/cancelación | cancelled | Registra resolución y pago pendiente de devolver |

`expired` solo puede revivir por un pago ya iniciado y validado. `cancelled` nunca revive automáticamente por pago tardío: registrar incidente de pago en revisión y mantener cancelación hasta resolución explícita. `completed` no se reabre para registrar nuevos pagos; registrar balance y conciliación por separado.

## Pagos tardíos, duplicados y desordenados

Firma válida no basta: consultar la transacción en Wompi y comparar entorno, reference, moneda, monto e ID con el intento guardado. Proveedor no disponible → persistir evento pendiente, sin confirmar. Volver a procesar de forma segura.

El hold puede vencer mientras un medio de pago tarda. Si se recibe APPROVED fuera del hold, intentar recuperar exactamente la capacidad antes de confirmar; si no existe, conservar pago recibido en `application_status=review` y booking `payment_review`. Bloquear también el lead: si una versión posterior ya tiene reserva activa, el pago antiguo va a revisión, aunque haya unidades libres. Contactar responsable y cliente; ofrecer nueva fecha o devolución por gestión humana, sin crear sobreventa ni prometer devolución ya ejecutada.

Dos APPROVED de intentos diferentes para la misma reserva: aplicar uno al anticipo; el segundo queda en revisión por duplicidad, no crea segunda reserva ni se convierte en saldo sin conciliación expresa. Un webhook duplicado devuelve éxito sin efectos nuevos. Un DECLINED atrasado no revierte un APPROVED; verificar estado actual del proveedor. Si un VOIDED afecta dinero ya aplicado, abrir incidencia financiera y bloquear despacho hasta resolución; no liberar stock automáticamente.

La redirección al terminar checkout solo permite consultar estado. «Pago recibido, verificando reserva» es distinto de «Reserva confirmada». Evento `deposit_paid` se emite una vez por anticipo aprobado verificado y aplicado; un pago en revisión no se cuenta como reserva.

## Cambios, daños y operación

Reprogramar/cambiar cantidad requiere revisión humana, nueva cotización y transacción que sustituya asignaciones solo si el nuevo conjunto cabe. El precio viejo no se sobrescribe. Ajustes de cobro/reembolso quedan auditados; no cobro automático por diferencia.

Retrasos: operaciones extiende el bloqueo antes de vencer cuando sea posible. Si amenaza otra reserva, incidencia y reasignación; no declarar disponible un equipo que no regresó. Al final del intervalo, recursos sin devolución inspeccionada pasan a quarantine y no se reutilizan. Un cron detecta reservas vencidas sin retorno; toda consulta de disponibilidad también excluye esas unidades hasta inspección, incluso si el cron se atrasó.

Pérdida/daño: registrar unidad, accesorios, evidencia y responsable; cuarentena inmediata. V0 no fija multas automáticas, no debita tarjetas ni libera garantías automáticamente. Se determina reparación/reemplazo según política contractual aprobada. En simulación no se cobra depósito de garantía adicional; anticipo y garantía son conceptos separados.

Saldo: vence dos días calendario antes del inicio. Recordatorio manual al principio; no cancelar automáticamente por mora. No despachar con saldo pendiente salvo decisión admin con responsable, monto, fecha comprometida y motivo, conforme a la flexibilidad B2B del PM §4.

## Casos de aceptación críticos

| ID | Dado / acción | Resultado esperado |
|---|---|---|
| R01 | 14 unidades, 2 técnicos; solicitar 10 | Holding con 12 unidades y 2 técnicos |
| R02 | 14 unidades, 1 técnico; solicitar 10 | No disponible por personal |
| R03 | Una reserva de 10; otra solicita 2 mismo intervalo | No disponible por falta de respaldo |
| R04 | Dos clientes compiten por mismas últimas 6 unidades | Una sola reserva obtiene hold |
| R05 | Hold vence, nueva reserva ocupa recursos, luego llega pago viejo | Pago en revisión, nueva reserva preservada |
| R06 | Misma notificación aprobada llega tres veces | Una aplicación de anticipo y una confirmación |
| R07 | Navegador envía total inferior / éxito falso | No cambia importe ni reserva |
| R08 | Evento termina y otro bloqueo inicia exactamente en límite de buffer | Permitido si retorno inspeccionado y técnicos disponibles |
| R09 | Fecha sin técnico registrado | No disponible, aunque existan visores |
| R10 | Bloqueo mantenimiento cruza intervalo | Unidad excluida |
| R11 | Cotización vence antes de aceptar | 409; emitir nueva versión |
| R12 | Cancelada recibe pago tardío | Mantener cancelación y abrir revisión de pago |
| R13 | Devolución atrasada y cron detenido | Disponibilidad excluye unidades afectadas |
| R14 | Cambio de fecha falla por conflicto | Reserva original intacta |
| R15 | Cotización vence durante hold vigente | Hold conserva precio aceptado hasta su propio vencimiento |

La simultaneidad debe probarse contra PostgreSQL real, no solo mocks en memoria.
