# Validaciones para operar y medición

## Gates de evidencia

Todos parten **pendientes**. Son verificaciones concretas de PM §15, no preguntas abiertas sobre el diseño. Se mantienen los supuestos S0 hasta que evidencia real permita ratificarlos o versionarlos.

| ID | Responsable | Evidencia requerida | Qué desbloquea |
|---|---|---|---|
| G01 | Operaciones | Lista inspeccionada de 14 Q2 y 14 Q3, seriales, accesorios, condición y fechas de mantenimiento; completar plantilla inventario | Stock real; ajustar capacidad si hay faltantes |
| G02 | Finanzas/operaciones | Costos por técnico/jornada/hora extra, transporte por cobertura/horario, preparación, consumibles, licencias, pasarela y comisión, con fecha/fuente | Sustituir costos simulados y programar pricing |
| G03 | Operaciones | Roster identificado y ventanas reales, prueba de ratio 1:5, respaldo 1:5 y buffers 2 h; validar estándar 2–10 | Capacidad y simultaneidad real |
| G04 | Operaciones | Cobertura urbana aprobada, costo de ida/vuelta, criterios de acceso y horario; evidencia por recinto cuando haga falta | Logística automática para casos dentro de cobertura |
| G05 | Finanzas/contador | Entidad facturadora, impuestos por línea, tratamiento del anticipo, documento emitido y condiciones Wompi reales | Totales fiscales y cobro de producción; sin asesoría fiscal implícita |
| G06 | Operaciones/contenido | Catálogo o contenido del cliente con autorización comercial comprobada y costo; prueba de reproducción | Oferta de contenido cobrable/usable |
| G07 | Negocio y asesor correspondiente | Políticas aprobadas: cancelación/cambio, mora, daños/faltantes, garantía/deducible, responsables, privacidad/retención y aceptación contractual | Reglas comerciales mínimas y términos publicables |
| G08 | Negocio | Búsqueda de nombre/marca y dominio, datos de contacto, entidad y dirección publicables | Publicar identidad provisional/definitiva |
| G09 | Desarrollo/negocio | Credenciales por entorno, configuración Wompi/WhatsApp/analítica, pruebas E2E y recuperación, costo recurrente aprobado | Activar integraciones y lanzamiento |
| G10 | Negocio | Tarifa de producción versionada, margen real ≥55%, procedimiento de excepciones y responsables de atención | Autorizar ventas y anticipo estándar |

G01–G07 son la traducción del gate antes de código de pricing; G08–G10 habilitan lanzamiento. Registrar responsable nominal, fecha y referencia de evidencia cuando el equipo aporte datos. Un booleano en un JSON no reemplaza evidencia. No bloquear desarrollo de estructura, contenido o CRM por estos datos.

**Límite de autoservicio inicial:** solo los eventos cuya cobertura, lugar y contenido ya estén verificados llegan al checkout automático. Un recinto/contenido nuevo entra a revisión humana. Esto evita prometer operación validada a partir de una casilla del cliente; tras validar, se emite versión estándar pagable. Medir cuántas solicitudes necesitan esa revisión para mejorar reglas con evidencia.

## Reglas operativas mínimas S0

Responsable comercial atiende solicitudes y excepciones; operaciones valida lugar, técnicos y contenido; finanzas concilia pagos y saldo. En sandbox estos roles se representan con fixtures. En producción se asignan personas reales, sin asumir que alguien está de guardia todo el día.

SLA objetivo PM §6: respuesta automatizada <2 min y excepción humana <2 h hábiles. S0 define horario hábil lunes a viernes 08:00–18:00 Bogotá, excluyendo festivos configurados; fuera de horario informar próxima ventana. No prometer atención humana inmediata 24/7.

Antes de salida: confirmar saldo/excepción aprobada, lugar/contacto, contenido validado, seriales/accesorios, carga/baterías, higiene, transporte y técnico. Al retornar: revisar seriales, accesorios, funcionamiento, evidencia e incidentes; ninguna unidad vuelve a ready sin revisión. Usar registro manual v0, luego automatización de semana 7 cuando corresponda.

Cambios/cancelaciones: solicitud no altera stock ni dinero hasta resolución admin. No imponer porcentaje de penalidad inventado. S0 cierra el tratamiento en software como manual; G07 debe aprobar el texto y las condiciones económicas antes de uso comercial. No confundir esta decisión de flujo con una política legal ya validada.

## Medición MVP

| Evento | Trigger único | Campos permitidos |
|---|---|---|
| quote_start | Primer uso del formulario por intento | event_id, sesión seudónima, página, campaña |
| quote_complete | Quote emitida persistida, no simple clic | event_id=quote_id, modelo, cantidad, subtotal, moneda |
| whatsapp_click | Clic al canal | event_id, página, campaña; no teléfono/contacto |
| deposit_start | Intento de checkout creado | event_id=payment_id, quote_id, anticipo, moneda |
| deposit_paid | Pago verificado y aplicado a reserva | event_id=payment_id, booking_id, anticipo, moneda |

WhatsApp calificado y llamada son conversiones manuales verificadas en CRM (PM §9); no equiparar clic a lead calificado. `quote_complete` no cuenta solicitudes asistidas sin cotización. Eventos Ads se habilitan conforme a configuración/consentimiento aprobado; staging no contamina datos reales. Dedupe persistente en servidor para deposit_paid; recargar página no lo vuelve a emitir.

Atribución S0: guardar primer y último toque conocido (UTM source/medium/campaign/content/term, GCLID, landing, referrer y timestamp) durante 30 días bajo política aprobada. Fuente desconocida se etiqueta unknown. No reemplazar primer toque por directo. Un contacto puede tener varias oportunidades con atribución propia. Sin atribución multicanal compleja.

## Reporte semanal simple

Exportación CSV de leads/quotes/bookings e ingreso manual de gasto por canal; revisión semanal por negocio. Sin integración Ads de lectura ni BI nuevo en MVP.

| Métrica PM | Definición operativa | Gate/meta |
|---|---|---|
| Lead calificado | Contacto válido, evento identificable, lugar/fecha/cantidad y encaje B2B | ≥8–10 acumulados semana 4 |
| Lead → cotización | Oportunidades calificadas con ≥1 quote / oportunidades calificadas | >60%; versiones no multiplican numerador |
| Cotización → reserva | Oportunidades cotizadas con reserva pagada confirmada / oportunidades cotizadas | Exploratorio 15–25%; revisar tras 30+ oportunidades |
| AOV | Venta antes de impuestos de reservas confirmadas no canceladas / número de esas reservas | 2,5 M+ B2B, segmentar |
| Margen de contribución | Venta neta de impuestos menos costos directos del doc 05 | ≥55%; separar previsto de costo real de evento cerrado |
| CAC pagado | Gasto atribuido a canal/cohorte / clientes nuevos pagados de esa cohorte | ≤15% de contribución esperada del primer pedido; cero clientes → no calculable, mostrar gasto |
| Utilización Q3 | Días-unidad de Q3 usados en eventos / días-unidad disponibles operativamente en ventana | >25–30% sostenido antes de expansión; respaldo no cuenta como vendido |
| Ingreso por visor disponible/día | Venta de hardware / días-unidad disponibles del modelo | Seguimiento, no meta inventada |
| Tiempo humano | Minutos administrativos registrados / reserva estándar | <45 min en semana 7 |
| Recompra | Clientes B2B con segunda reserva / clientes B2B de cohorte con ventana comparable | >20% a seis meses; no evaluable plenamente en ocho semanas |

Para utilización: contar un equipo usado una sola vez por día local, aunque atienda dos eventos; denominador excluye días completos no operativos por mantenimiento, no excluye días reservados. Reportar ventana y criterio constantes. El saldo pendiente no disminuye ingreso reservado; exponer efectivo cobrado aparte. Reembolsos/cancelaciones ajustan la cohorte, sin borrar registros.

## Adquisición preparada sin ejecutar campañas

PM §9: Google Search principal, outbound B2B segundo. Grupos: VR transaccional → `/alquiler-meta-quest-bogota`; eventos corporativos → `/realidad-virtual-para-eventos`; Quest → página del modelo. Keywords iniciales: alquiler realidad virtual bogotá, alquiler gafas vr bogotá, alquiler meta quest bogotá, alquiler oculus bogotá, realidad virtual para eventos, vr para eventos empresariales, alquiler quest 3, alquiler quest 2.

Negativos iniciales PM: comprar, usado, reparación, gratis, empleo, curso, descargar, APK, wallpaper, porn, precio Meta retail y juegos domésticos. Sin volúmenes/CPC inventados; Keyword Planner y cotizaciones restantes se completan antes de gasto.

Outbound: lista objetivo 150–250 cuentas; meta PM 200 cuentas, 80 contactos válidos, 20 conversaciones, 5 solicitudes y 1–2 reservas/acuerdos. Registrar agencia, contacto, fuente, tamaño, ciudades, tecnologías y frecuencia. No se ha recopilado ni contactado a nadie en Sprint 0. White-label es mensaje comercial; no portal partner ni tarifa de descuento automática.

Presupuesto PM §12: piloto 4,5–7 M, Search 1,8–2,5 M/30 días, servicios web 150–500 mil, herramientas 300–800 mil, contingencia 1–2 M; excluye activos/tiempo interno. Los rangos por rubro del PM suman 3,55–7 M si se toman todos los mínimos/máximos: no asumir que el mínimo de cada rubro es un presupuesto aprobado de 4,5 M. Negocio debe asignar una combinación dentro del total. No se han contratado servicios ni activado pauta.

## Decisión al final de ocho semanas

PM §13 GO VR: (≥3 reservas pagadas **o** pipeline altamente calificado ≥10 M) **y** margen ≥55% **y** canal repetible **y** operación sin fricción crítica. Pipeline altamente calificado S0: oportunidad con interlocutor válido, fecha, alcance, presupuesto discutido y siguiente paso confirmado; no sumar todas las consultas.

GO automatización adicional: ≥8–10 reservas y tareas repetitivas identificadas. Nueva categoría: ≥3 solicitudes reales del mismo equipo en 60–90 días o subalquiler/partner rentable, con utilización VR estable. No interpretar como autorización de compra automática.

ITERATE si hay leads y falla conversión/precio; revisar oferta antes de aumentar gasto. STOP/pausa si, tras tráfico suficiente documentado, no hay leads calificados, CAC persistentemente excede margen esperado o operación consume demasiado tiempo. El PM no fija cifra de «tráfico suficiente»; negocio documenta volumen y calidad antes de concluir STOP, sin inventar umbral estadístico.
