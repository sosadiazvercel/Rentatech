# Backlog priorizado y criterios de aceptación

## Orden de ejecución

S0 es este paquete. S1 prepara la base y la web, S2 completa el recorrido transaccional y S3 el soft launch. Son incrementos de entrega S0; no una promesa de duración ni una sustitución del roadmap semanal del PM. S1+S2 corresponden al MVP de semana 2, condicionado al cierre previo de oferta/datos de semanas 0–1. No activar S2 pricing si G01–G07 siguen pendientes.

P0 bloquea lanzamiento o integridad; P1 completa el MVP/adquisición; P2 corresponde a optimización posterior. Tamaños S/M/L son relativos, no días comprometidos. Dueños por rol: negocio, operaciones, finanzas y desarrollo; no se inventan personas.

## Sprint 1 listo para iniciar

| ID | Prioridad / tamaño | Historia y entregable | Dependencias | Aceptación |
|---|---|---|---|---|
| S1-01 | P0 / S | Desarrollo crea repo, Next.js, lockfile, entornos y CI | Paquete S0 | Build, lint y tipos pasan; `.env` excluido; no secretos en cliente |
| S1-02 | P0 / M | Desarrollo crea migraciones de entidades y restricciones | S1-01, doc 04 | DB vacía migra; FK/CHECK/exclusión rechazan registros inválidos; fixtures solo dev |
| S1-03 | P0 / M | Auth interna y roles | S1-02 | Público no lee PII/costos; operador no cambia tarifa; admin invitado accede |
| S1-04 | P1 / M | Home, VR y Quest 2/3, dos landing SEO | S1-01, doc 01 | Las seis rutas funcionan a 360 px; CTA precarga modelo; sin categorías futuras ni testimonios falsos |
| S1-05 | P0 / M | Formulario de ocho grupos y validación | S1-04, doc 02 | Técnico no se puede quitar; incompletos muestran error; caso especial se recibe como solicitud asistida |
| S1-06 | P0 / M | Captación y CRM básico | S1-02/03/05 | Contacto repetido no duplica customer; nueva oportunidad sí se conserva; consentimiento y atribución quedan guardados |
| S1-07 | P1 / S | Contratos y pantallas de resultado con fixtures | S1-05, doc 07 | UI distingue estimación, revisión y confirmación; mocks rotulados; no invoca pagos ni motor de pricing |
| S1-08 | P0 / S | QA y handoff a S2 | S1-01…07 | Pruebas de acceso, validación y captación pasan; resultados y gates pendientes en README |

En paralelo, negocio/operaciones/finanzas ejecutan G01–G07. Su ausencia no bloquea S1-01…08; sí bloquea código de pricing de S2 y publicación comercial. No construir un motor ejecutable con valores ficticios «para avanzar» contra PM §15.

## Sprint 2 y terminación del MVP

| ID | Prioridad / tamaño | Historia y entregable | Dependencias | Aceptación |
|---|---|---|---|---|
| S2-01 | P0 / M | Admin de inventario y técnicos | S1-02/03, G01/G03 | Importar seriales, inspeccionar, declarar ventanas; no activar unidad sin serial o técnico ficticio |
| S2-02 | P0 / L | Disponibilidad, holds, buffers y exclusión | S2-01 | R01–R04, R08–R10 y R13 del doc 06 pasan en DB real; sin carrera de sobreventa |
| S2-03 | P0 / M | Motor pricing v0 y versiones | G01–G07, S1-02 | Fórmula reproduce casos; costo real aprobado sustituye sandbox; margen inferior a 55% no permite checkout |
| S2-04 | P0 / M | Quotes, enlaces, PDF y aceptación | S2-02/03, políticas aprobadas | PDF/web coinciden, quote expira, token no permite listar otras; versionado conserva evidencia |
| S2-05 | P0 / L | Checkout y webhook Wompi sandbox | S2-04, cuenta sandbox | Firma falsa y monto distinto no confirman; duplicados/tardíos/desordenados cumplen doc 06 |
| S2-06 | P0 / M | Estados comerciales y conciliación | S2-05 | Pago aprobado separado de reserva; admin ve revisiones; saldo/reembolso auditados; no pago marcado por operador |
| S2-07 | P1 / M | Calendario interno y operación manual | S2-02/06 | Reservas y bloqueos visibles; devolución/daño cambian disponibilidad; sin sincronizar Google Calendar |
| S2-08 | P1 / M | WhatsApp FAQ/IA y handoff | S1-06, cuenta API, FAQ aprobada | Responde FAQ; deriva excepción; se detiene durante intervención humana; no negocia/cobra |
| S2-09 | P1 / S | GA4/GTM, UTMs y conversiones | S1-06, S2-05 | Eventos del doc 09 verificados en prueba; deposit_paid único; datos personales excluidos |
| S2-10 | P1 / S | SEO, políticas y calidad de páginas | S1-04, G07/G08 | Sitemap y canonical correctos, datos estructurados reales; rutas privadas no indexables |
| S2-11 | P0 / M | QA end-to-end y recuperación | S2-01…10 | Lead → quote → hold → sandbox APPROVED → una reserva; conflicto/reintento/reinicio probados; restauración ensayada |

El cierre de S2-11 satisface el gate técnico PM §11 semana 2. No sustituye las validaciones comerciales de producción.

## Soft launch y fases del Plan Maestro

| ID | Prioridad | Momento PM | Entregable y aceptación |
|---|---|---|---|
| L01 | P0 | Semana 3 | Activar producción tras G01–G10, prueba controlada conciliada y políticas aprobadas; sin cobros de prueba involuntarios |
| L02 | P1 | Semana 3 | GBP/SEO, 20 cuentas piloto, Search pequeño y tracking comprobado; presupuesto autorizado por negocio |
| L03 | P1 | Semana 4 | Search y outbound 100 cuentas; revisar términos; objetivo acumulado 8–10 leads calificados |
| L04 | P1 | Semana 5 | Ajustar oferta con 30+ oportunidades cuando existan; primer caso real; no fabricar conclusiones por falta de muestra |
| A01 | P2 | Semana 5 | Follow-up 24h/72h/7d con stop al responder, ganar, perder u optar por no recibir; revisar permisos y plantillas |
| L05 | P1 | Semana 6 | Outbound 200 cuentas/partners; aumentar Ads solo si CAC y margen lo permiten |
| A02 | P2 | Semana 7 y gate PM §13 | Calendario externo, tareas T-7/T-2/T-1 y checklist automatizado; una tarea/evento, reprogramación consistente |
| A03 | P2 | Semana 7 y gate PM §13 | Postevento: saldo, NPS, reseña, daños y oferta posterior; permisos y stop definidos |
| L06 | P0 | Semana 8 | Evaluar GO/ITERATE/STOP con métricas del doc 09; decisión escrita, sin expansión automática |

Las épicas A–E del PM §14 quedan cubiertas: A=S0/S1; B=S1-04/05 y S2-04; C=S2-01…07; D=S2-09/10 y reporte semanal manual; E=S2-08, A01–03 y alertas de conflicto de S2-07. El dashboard semanal es una exportación/reporte sencillo, no BI.

## Exclusiones explícitas

Sin historias para marketplace, ERP, app, fidelidad, todas las excepciones de pricing, descuentos por IA, nuevas familias, garantías/KYC automatizados o blog masivo. Si se solicita una venta de nueva tecnología durante piloto, se gestiona manualmente por subalquiler y se mide; no crear integración con proveedores ni stock ficticio.

## Definición de terminado por historia

Cumple criterio observable, respeta clasificación PM/S0/POST, no mezcla sandbox con producción, incluye validación proporcional, actualiza documentación si cambia un contrato y no introduce PII en logs. Pruebas de dinero, permisos y concurrencia son obligatorias para sus respectivas historias; no hacer tests que solo repitan el texto de páginas.
