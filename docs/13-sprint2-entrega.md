# RENTATECH — Sprint 2

## Autoridad y cambios respecto a Sprint 0

La instrucción del propietario [Sprint 2](referencias/sprint2-brief-usuario.md) actualiza las decisiones provisionales del Plan Maestro/Sprint 0 para este incremento. No se reconstruyó Sprint 1; se ampliaron su PostgreSQL, autorización, rutas y estilos.

Confirmación adicional del propietario en el chat: hardware igual entre 4 y 8 horas; solo cambia tarifa del técnico. Rangos aprobados por unidad:

| Equipo | Cantidad | COP / unidad |
|---|---:|---:|
| Meta Quest 2 | 3–9 | 160.000 |
| Meta Quest 2 | 10–14 | 145.000 |
| Meta Quest 3 | 3–9 | 220.000 |
| Meta Quest 3 | 10–14 | 200.000 |
| Meta Quest 3 | 15 | 190.000 |

Se reemplaza la relación provisional 1:5 por 1 técnico para 3–10 y 2 para 11–15. Mínimo 3. Tarifa de técnico por persona: 4h 400.000, 5h 480.000, 6h 560.000, 7h 640.000, 8h 700.000. Todas las escalas son editables. No se construyó pago Wompi ni holds: el nuevo brief los pospone.

## Recorrido

1. `/cotizar`: cuatro pasos cortos con modelo, cantidad, fecha/inicio/duración, lugar, datos y resumen. Consulta disponibilidad de equipos; tarifa y personal calculados por servidor. El cliente no puede retirar al técnico ni enviar un total calculado por él.
2. Solicitar reserva guarda una cotización RT-Q, sus líneas y snapshot, una oportunidad en el CRM y una notificación interna. No bloquea inventario. Repetir el mismo envío no duplica.
3. `/admin/operaciones`: Resumen, Inventario, Tarifas, Cotizaciones, Reservas, Personal e Incidentes. El enlace Operaciones está junto al CRM. Usa el acceso local existente, sin imprimir credenciales.
4. Completar parámetros pendientes en Tarifas; registrar personal real en Personal. Para actualizar una cotización, abrir **Editar y crear nueva versión**. La original queda reemplazada y conserva importes. Se permiten importes manuales por caso; vacíos usan configuración vigente.
5. Marcar enviada registra el estado; no envía email. Confirmar exige importe recibido verificado suficiente para el anticipo, referencia única, revisión operativa y aceptación de condiciones, más técnicos activos sin cruces.
6. Confirmar revalida y asigna unidades concretas y técnicos en una transacción. Cancelar libera asignaciones; no calcula una penalidad no aprobada ni ejecuta un reembolso. Los pagos y reembolsos se registran manualmente con referencia y auditoría; no mueven dinero.
7. Inicio/despacho exige saldo pagado y equipos operativos. Devolución completa libera asignaciones. Incidente retira el activo afectado de disponibilidad; resolver incidente no reactiva el equipo automáticamente, requiere revisión en Inventario.

## Datos y concurrencia

Migración aditiva 0003. Se reutilizan equipment, inventory_unit, pricing_version, quote/quote_line, booking, unit_allocation, technician/technician_allocation, payment, customer/lead y audit_log. Se añaden settings, transport_zone, incident, vr_experience, internal_notification y outbox de notificaciones.

29 activos declarados por propietario: Q2-001…014 y Q3-001…015. Seriales nulos permitidos expresamente para carga posterior; vacíos no válidos. No se fabrican seriales ni técnicos reales. Las 28 fixtures de Sprint 1 se conservan identificadas y excluidas del catálogo/operación de Sprint 2.

Los estados reservados/en evento son derivados de asignaciones: no restar permanentemente una unidad por una reserva de otra fecha. Ventanas [inicio-buffer, fin+buffer), con rangos PostgreSQL y exclusión de solapamientos; bloqueo transaccional por producto y filas de técnicos ordenadas. Dos confirmaciones concurrentes no pueden consumir las mismas unidades ni al mismo técnico. Los buffers y tarifas quedan en el snapshot de cada cotización.

La regla general de personal cubre la categoría VR de este sprint. Equipment admite códigos y categorías adicionales a nivel de datos; no se publicaron nuevas familias. QuoteLine prepara conceptos de montaje y contenido; los servicios adicionales avanzados siguen fuera de alcance.

Configuración versionada con control de concurrencia. Snapshot y líneas son inmutables. El servidor recalcula el precio desde la DB y jamás confía en un precio del navegador. Anon/authenticated no acceden directamente a tablas, y todas las operaciones privadas requieren sesión. Solo admin muta; operador consulta. No hay rutas públicas que enumeren cotizaciones o clientes.

## Variables pendientes (NULL no equivale a cero)

- Transporte Bogotá y fuera de Bogotá (este último se resuelve manualmente por cotización).
- Impuestos y buffers antes/después.
- Costo interno de técnicos (distinto a precio de venta), transporte, contenido y otros costos.
- Hardware para >8 horas; tarifa adicional del técnico preparada pero sin activar la referencia de 100.000 como definitiva.
- Política definitiva de cancelación, penalidades y daños; textos configurables, sin porcentajes inventados.
- Personal real, seriales y verificación física; contenido y permisos comerciales.

Hasta completar transporte, impuestos, buffers y tarifas aplicables, el resumen muestra estimación parcial y el administrador no puede confirmar. El conteo de disponibilidad con buffer desconocido se señala como provisional. Anticipo inicial propuesto 50%, editable y con aceptación explícita al confirmar. Vigencia técnica inicial de cotización 168 horas (7 días), editable; debe validarse comercialmente antes de lanzamiento.

## Límites explícitos

La recepción de cotizaciones está activa en desarrollo y producción sin interruptores de entorno. Cada solicitud se confirma únicamente después de persistirse en PostgreSQL/Supabase. El correo transaccional requiere `RESEND_API_KEY`, `EMAIL_FROM` y `EMAIL_NOTIFICATION_TO`; si falta o falla, la cotización permanece guardada y el outbox registra el estado para revisión.

Pasarela, WhatsApp, contratos, firma, automatizaciones logísticas, upsells y contenido avanzado no implementados conforme a prioridades del nuevo brief. VRExperience tiene estructura de compatibilidad/licencias y no publica experiencias no verificadas. Los incidentes tienen estructura para fotos; no se implementó carga de archivos.

Los listados internos presentan las últimas 200 cotizaciones/reservas/incidentes y 100 notificaciones; inventario y personal completos. No es un ERP ni un reporte financiero. La disponibilidad exacta se valida por fecha al cotizar y confirmar.

## Pruebas

Casos A/B: 3 Quest 3 + técnico = 1.060.000; 10 Quest 3 + técnico = 2.400.000, antes de transporte e impuestos.
Caso solicitado de 8 Quest 3 durante 6h: hardware 1.760.000 + técnico 560.000 = 2.320.000 antes de transporte/impuestos.
C: dos gafas rechazadas. D: reserva de 10 deja 5. E: reserva de 15 deja 0. F: cancelar devuelve 15.

Las pruebas de integración se ejecutan sobre bases locales aisladas nexokit_test y rentatech_sprint2_test. Las pruebas del navegador usan datos ficticios explícitos; cancelan reservas, desactivan el técnico QA y restauran las variables comerciales a su valor anterior. No convierten los ceros utilizados durante QA en decisiones comerciales.

## Resultado de verificación

- 15 pruebas unitarias de la base aprobadas.
- 21 pruebas de integración aprobadas (8 de Sprint 1 y 13 de Sprint 2), incluidos concurrencia, historial inmutable, buffers, técnicos compartidos, pagos, incidentes, roles y casos A–F.
- 5 recorridos de navegador aprobados: páginas móviles, cotizador → cotización → CRM, permisos/origen, captura visual y confirmación/cancelación administrativa. El caso de cotizador se repitió individualmente al ajustar el formato de moneda y la espera del cierre de sesión en la prueba.
- Build con TypeScript y lint correctos. Revisión visual del resumen en 360 px/escritorio y administración móvil.
- Verificación posterior: 14 Quest 2 y 15 Quest 3; cero reservas de prueba activas; transporte, impuestos y buffers siguen NULL. Los movimientos de prueba permanecen identificados y auditados, no son cobros reales.
