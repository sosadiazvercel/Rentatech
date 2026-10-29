# Autoridad de fuentes y decisiones

## Fuentes locales

| Código | Archivo | Fecha | Uso |
|---|---|---|---|
| PM | `sources/Plan_Maestro_Alquiler_Tecnologia_Eventos_v1.0.docx` | 26 septiembre 2026 | Oferta, prioridades, roadmap, gates |
| DS | `sources/Deep_Search_Paso_1_Alquiler_Tecnologia_Colombia(1).pdf` | 22 septiembre 2026 | Contexto de mercado y riesgos |
| Conversación | Preparar Sprint 0 | Contexto de encargo | No contiene decisiones adicionales de negocio |

Los paths `/mnt/data/…` del encargo corresponden a estos archivos sincronizados. La lectura incluyó texto y tablas del PM y las nueve páginas de DS. Las referencias de competidores se conservan como observaciones históricas del documento, no como precios vigentes verificados.

## Decisiones del Plan Maestro que gobiernan el producto

| ID | Decisión PM | Localizador | Consecuencia implementable |
|---|---|---|---|
| P01 | Marca independiente, amplia y no limitada a VR | §1, §3 | Home de tecnología; VR es una categoría |
| P02 | 14 Quest 2 y 14 Quest 3 existentes | §1 | Capacidad declarada, no stock vendible sin inspección |
| P03 | Bogotá y alquiler siempre operado | §1, §4 | Sin checkout de hardware sin técnico |
| P04 | Quest 2 Essential, Quest 3 Event, Event Pack y Full Experience | §5 | Dos equipos; paquetes calculados y oferta compleja asistida |
| P05 | Precios de prueba, visibles desde | §5 | Tarifa versionada, extras e impuestos desglosados |
| P06 | Anticipo aprobado para reservar | §4, §7 | Redirección del navegador no confirma pago |
| P07 | Web, cotizador, CRM, calendario interno, Wompi, WhatsApp IA, SEO y analítica | §8, §14 | Frontera del MVP, distribuida en incrementos |
| P08 | Follow-up semana 5; automatización operativa semana 7 | §11 | No ejecutar secuencias ni calendario externo en Sprint 1 |
| P09 | Margen ≥55%, AOV objetivo 2,5 M+, CAC ≤15% del margen esperado | §6 | Validación económica por reserva; AOV no es compra mínima |
| P10 | Validación de ocho semanas y gates de expansión | §1, §13 | No comprar ni activar nuevas familias |
| P11 | Datos reales antes de código de pricing | §15, §18 | Gate separado de páginas, CRM y esquema |
| P12 | No ERP, marketplace, app nativa ni descuento autónomo por IA | §8 | Ningún backlog temprano incorpora estos módulos |

## Discrepancias resueltas

| DS | PM prevaleciente | Resolución S0 |
|---|---|---|
| «Sin cotización» y experiencia e-commerce (p.2,7,8) | Cotizador y solicitud/reserva; sin e-commerce complejo (§1,8) | Cotización instantánea para estándar y handoff para excepciones |
| Hologramas como segunda familia (p.7) | No compras de categorías en piloto y expansión con evidencia (§12,13,16) | Sin productos ni páginas activas de holografía |
| Packs 2, 5, 10, 15 (p.7) | Event Pack 5–10 y stock existente (§5) | Atajos 5 y 10; otras cantidades se evalúan sin crear cuatro productos |
| Operador como extra (p.7) | Experto siempre presente (§4) | Técnico obligatorio y calculado; nunca checkbox para quitarlo |
| Identidad, contrato automatizado y garantía liberada automáticamente (p.6) | Reglas de riesgo mínimas y MVP liviano (§8,15) | Evidencia y aceptación de condiciones; revisión humana de daños; sin KYC ni escrow automático |
| Automatizar todo salvo mundo físico (p.7) | Automatización progresiva (§11,13) | CRM y confirmación seguros primero; seguimiento y postventa después |

## Supuestos cerrados de Sprint 0

Todos los importes son COP. «Cerrado» significa una base inequívoca de diseño, no aprobación comercial ni corroboración externa.

| ID | Supuesto | Valor y efecto | Ámbito |
|---|---|---|---|
| S01 | Marca provisional | NexoKit; descriptor Tecnología para eventos | Diseño privado; validar nombre/dominio antes de publicar |
| S02 | Caso estándar | Bogotá urbana, interior, un lugar, una fecha, 1–8 h, inicio ≥72 h, operación entre 08:00–20:00 | Política v0 a validar operativamente |
| S03 | Cantidad estándar | 2–10 visores, un solo modelo por reserva | Resto se registra como solicitud asistida |
| S04 | Jornada | Hasta 4 h; de 5 a 8 h incremento por hora entera iniciada | Simulación; no se asume día de 24 h |
| S05 | Tarifas hardware | Quest 2 170.000, Quest 3 290.000 por jornada; +15% base/hora adicional | Simulación dentro de rangos PM |
| S06 | Técnico | Uno por hasta 5 visores; base de venta 280.000/4 h y 55.000/h extra por técnico | Simulación; exige validar costo y capacidad |
| S07 | Logística y setup | 160.000 transporte ida/vuelta y 120.000 setup por evento | Simulación Bogotá urbana |
| S08 | Respaldo | ceil(cantidad/5) visores del mismo modelo, sin cobro | Se bloquean junto a los de uso |
| S09 | Buffer temporal | 2 h antes y 2 h después para equipos y técnicos | Se bloquea intervalo completo |
| S10 | Pago | Anticipo 50%, saldo T-2 días; sin garantía adicional estándar provisional | Aceptación comercial previa a producción |
| S11 | Cotización y hold | Cotización 24 h; hold de checkout 20 min, sin renovación automática | Revisión de disponibilidad al aceptar y al pagar |
| S12 | Impuestos | Simulación 19% uniforme; situación real pendiente | Nunca inferir obligación fiscal del supuesto |
| S13 | Contenido | Solo contenido del cliente con autorización verificada; setup incluido | Juegos, licencias y producción se cotizan manualmente |
| S14 | Arquitectura | Monolito Next.js + Supabase; pagos Wompi; sin CRM externo | Decisión técnica |
| S15 | Excepciones | No producir precio vinculante, no checkout; lead con motivo | No implementar motor de excepciones |
| S16 | Cambios y cancelaciones | Revisión humana, conservar versión aceptada y registrar resolución | Sin penalizaciones ni devoluciones automáticas |
| S17 | Confirmación | Requiere pago verificado, capacidad íntegra y condiciones aceptadas | No sobreventa por confirmación optimista |

## Datos que no se pueden cerrar con supuestos

Seriales y condición de los 28 equipos, roster real de técnicos, costos reales, disponibilidad de dominio/marca, entidad facturadora, impuestos, licencias y política contractual aprobada. Se entregan plantillas y gates concretos; no se fabrican certificados, seriales ni aprobación legal. Ver documento 09.

## Control de cambios

Cada cambio posterior lleva ID, fecha, autor, motivo y pruebas afectadas. Una tarifa nueva crea versión nueva. Cotizaciones y reservas conservan su snapshot. Una modificación del modelo operativo o del roadmap requiere volver al PM y registrar explícitamente la desviación; un comentario de investigación no la autoriza.
