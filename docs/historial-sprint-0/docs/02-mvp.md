# Alcance exacto del MVP

## Frontera temporal

Sprint 0 entrega especificación. Sprint 1 inicia fundamentos y web; no equivale a ejecutar toda la semana 2 del PM. El lanzamiento MVP, después de completar los incrementos del backlog, incluye el recorrido estándar lead → cotización → anticipo → reserva, CRM y calendario internos, WhatsApp FAQ con handoff, SEO y medición (PM §8,14). Follow-ups programados, calendario externo y postventa automática siguen el roadmap de semanas 5 y 7.

## Rutas

| Ruta | Contenido / comportamiento |
|---|---|
| `/` | Categoría amplia, VR disponible, propuesta de valor, proceso y CTA |
| `/vr` | Solución VR, paquetes 5/10 y enlace a cada modelo |
| `/vr/quest-2` | Essential, usos, alcance y CTA precargado |
| `/vr/quest-3` | Event, usos, alcance y CTA precargado |
| `/realidad-virtual-para-eventos` | Intención corporativa, contenido propio, enlaza cotizador |
| `/alquiler-meta-quest-bogota` | Cobertura Bogotá y logística, contenido distinto |
| `/cotizar` | Formulario y resultado estándar o solicitud asistida |
| `/cotizaciones/[token]` | Snapshot de oferta y aceptación; no indexable |
| `/reservas/[token]` | Estado de pago y reserva; no indexable |
| `/politicas/servicio`, `/politicas/privacidad` | Textos aprobados y versionados antes de producción |
| `/admin` | Acceso interno; resumen operativo sin BI complejo |
| `/admin/leads`, `/admin/cotizaciones`, `/admin/reservas` | Listas, filtros, detalle, notas y estados |
| `/admin/calendario` | Reservas, holds, bloqueos y capacidad por fecha |
| `/admin/inventario`, `/admin/tecnicos` | Alta/estado de activos, ventanas de personal y bloqueos |

No crear páginas comerciales de categorías inexistentes. Preparar componente de categoría reutilizable; no rutas vacías que simulen oferta.

## Cotizador de ocho grupos

Los 6–8 campos del PM §8 se concretan en ocho grupos con subcampos; así se recogen todos los datos de §7 sin perder información.

1. Ciudad: Bogotá / otra. Otra dispara revisión.
2. Fecha y horario: fecha local, inicio, fin; selección en horas enteras para estándar.
3. Equipo y cantidad: Quest 2 o Quest 3, 2–10 estándar; admitir solicitud mayor sin cobrar.
4. Asistentes: entero positivo y propósito del evento; no confundir asistentes con visores.
5. Contenido: propio autorizado / juegos o licencias / personalización / no definido.
6. Lugar: nombre, dirección, interior/exterior y confirmación de acceso, energía y espacio seguro. Zona no validada → revisión.
7. Operación: técnicos requeridos calculados, nunca cero; solicitud de técnico adicional convierte a revisión v0.
8. Contacto: empresa, nombre, correo, teléfono, tipo de cliente y aceptación de política de datos. Marketing separado y opcional.

Los formularios no bloquean la captación de oportunidades fuera del estándar. Validar datos estructurales en servidor; datos incompletos se guardan como lead por revisar, nunca producen cotización pagable.

## Recorrido estándar

Formulario válido → lead → disponibilidad orientativa de equipo y técnico → cotización inmutable con desglose → cliente acepta condiciones → servidor revalida y crea hold → checkout por anticipo → webhook verificado → reserva confirmada → pantalla de confirmación.

Consultar o cotizar no bloquea stock. Si no quedan recursos al aceptar, mostrar conflicto y ofrecer recalcular; no aceptar pago sobre una cotización vieja sin revalidar. Una reserva nunca depende de que el cliente vuelva a la web después de pagar.

## Administración y roles

- Admin: configura inventario/técnicos, publica tarifas aprobadas, aprueba resolución de excepciones, concilia pagos y cancelaciones.
- Operador: gestiona leads, consulta agenda, actualiza preparación/entrega/devolución y registra incidentes; no cambia tarifa aceptada ni marca pagos Wompi como aprobados.
- Público: consulta productos y usa enlaces secretos de su propia cotización/reserva; no lista clientes, seriales, costos ni calendario interno.

CRM mínimo: fuente, empresa/contacto, solicitud, propietario, etapa, valor estimado, notas, motivo de pérdida y siguiente acción manual. Dedupe de contacto no elimina oportunidades diferentes.

## Incluido y diferido

MVP inicial: cotización PDF/link, inventario serializado y bloqueos, estados y anticipo, alertas visibles de conflicto, exportación simple semanal, WhatsApp FAQ/handoff y eventos de conversión. Checklist manual como registro de operación; sin orquestador de tareas.

POST semana 5: seguimiento automático 24 h / 72 h / 7 d y detener al responder. POST semana 7, sujeto al gate de automatización PM §13: T-7/T-2/T-1, Google Calendar, NPS, reseñas, siguiente oferta y tareas automáticas. Si el gate no se cumple, mantener procedimiento manual.

Fuera del piloto: marketplace multivendedor, portal de proveedores, nuevas familias de activos, ERP, app nativa, fidelización, blog masivo, BI complejo, pricing de todas las excepciones, IA negociadora, KYC/garantías automáticas y pago autónomo de producciones complejas.
