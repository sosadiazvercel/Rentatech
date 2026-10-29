# RENTATECH — SPRINT 2
## Sistema de cotizaciones, reservas, disponibilidad e inventario

**Proyecto:** Plataforma de alquiler de tecnología para eventos  
**Sprint:** 2  
**Objetivo:** Pasar de un sistema que recibe solicitudes a uno capaz de generar cotizaciones, controlar disponibilidad de equipos y gestionar reservas.

---

# 1. OBJETIVO DEL SPRINT

El Sprint 1 permitió construir la base del sitio y captar solicitudes.

El Sprint 2 debe convertir esa base en un sistema comercial y operativo real.

El usuario debe poder:

1. Seleccionar un tipo de equipo.
2. Seleccionar cantidad.
3. Seleccionar fecha.
4. Indicar duración del evento.
5. Ver un precio estimado o cotización.
6. Enviar sus datos.
7. Generar una solicitud de reserva.

Internamente, RENTATECH debe poder:

1. Saber cuántos equipos existen.
2. Saber cuáles están disponibles.
3. Evitar sobre-reservas.
4. Calcular automáticamente el precio.
5. Incorporar obligatoriamente personal técnico.
6. Gestionar el estado de cada cotización/reserva.
7. Bloquear inventario cuando una reserva sea confirmada.
8. Tener una estructura preparada para incorporar posteriormente otros equipos.

El objetivo no es construir todavía un ERP complejo.

Debe ser un sistema sencillo, robusto y fácil de administrar.

---

# 2. MODELO DEL NEGOCIO

RENTATECH no funciona como un alquiler tradicional donde el cliente recoge un equipo y se lo lleva.

El modelo está orientado principalmente a:

- eventos;
- agencias;
- activaciones;
- eventos corporativos;
- congresos;
- experiencias de marca;
- capacitaciones;
- experiencias VR.

Los equipos deben permanecer bajo supervisión de personal de RENTATECH.

Por seguridad y control del inventario:

**TODO ALQUILER DE GAFAS VR DEBE INCLUIR OBLIGATORIAMENTE UN TÉCNICO.**

El cliente no puede eliminar este servicio del pedido.

---

# 3. INVENTARIO INICIAL REAL

Actualmente existen:

| Producto | Inventario |
|---|---:|
| Meta Quest 2 | 14 unidades |
| Meta Quest 3 | 15 unidades |
| **Total** | **29 unidades** |

Este es el inventario físico inicial.

El sistema debe permitir modificar posteriormente estas cantidades desde administración sin modificar código.

---

# 4. INVENTARIO POR UNIDAD

Aunque comercialmente se alquilan cantidades, internamente cada dispositivo debe poder existir como activo individual.

Estructura sugerida:

### Asset

- id
- product_id
- serial_number
- internal_code
- status
- condition
- notes
- created_at
- updated_at

Ejemplos de códigos internos:

Q2-001  
Q2-002  
Q2-003  
...  
Q2-014

Q3-001  
Q3-002  
Q3-003  
...  
Q3-015

Los seriales reales se cargarán posteriormente.

---

# 5. ESTADOS DEL INVENTARIO

Cada activo debe poder estar en:

- AVAILABLE
- RESERVED
- IN_USE
- MAINTENANCE
- OUT_OF_SERVICE

En interfaz administrativa mostrar:

Disponible  
Reservado  
En evento  
Mantenimiento  
Fuera de servicio

---

# 6. REGLA DE CANTIDAD MÍNIMA

No se alquilan una o dos gafas.

**Mínimo obligatorio: 3 gafas por reserva.**

Si el usuario intenta seleccionar menos de 3:

Mostrar:

“Para garantizar una operación adecuada, nuestros servicios VR tienen un mínimo de 3 equipos.”

No permitir continuar.

---

# 7. PRECIOS INICIALES

Todos los precios deben estar almacenados en configuración/database.

NO hardcodear precios dentro de componentes frontend.

Moneda:

**COP — Pesos colombianos**

## META QUEST 2

Referencia inicial:

3 unidades: $480.000  
5 unidades: $800.000  
10 unidades: $1.450.000

Inventario máximo actual:

14 unidades.

## META QUEST 3

Referencia inicial:

3 unidades: $660.000  
5 unidades: $1.100.000  
10 unidades: $2.000.000  
15 unidades: $2.850.000

Estos precios corresponden inicialmente al componente de alquiler de hardware.

---

# 8. IMPORTANTE: MOTOR DE PRECIOS

No asumir que solamente existen paquetes de 3, 5, 10 y 15.

El cliente debe poder seleccionar:

3  
4  
5  
6  
7  
8  
9  
10  
etc.

hasta el inventario disponible.

Por lo tanto debe existir un Pricing Engine.

Arquitectura sugerida:

ProductPricingTier

- id
- product_id
- min_quantity
- max_quantity
- unit_price
- active

Esto permitirá modificar las escalas posteriormente.

Los precios actuales son una primera referencia comercial y deben quedar completamente configurables desde administración.

---

# 9. TÉCNICO OBLIGATORIO

Decisión comercial confirmada:

**Todo alquiler incluye obligatoriamente personal técnico de RENTATECH.**

Motivos:

- protección contra robo;
- custodia del inventario;
- entrega y recogida;
- configuración;
- asistencia al usuario;
- troubleshooting;
- control de equipos;
- control de accesorios;
- operación durante el evento.

El técnico NO debe aparecer como checkbox opcional.

Debe incorporarse automáticamente.

---

# 10. TARIFA DEL TÉCNICO

Tarifa inicial:

**Hasta 4 horas: $400.000 COP**

Precio de venta al cliente.

Duraciones adicionales preliminares:

5 horas: $480.000  
6 horas: $560.000  
7 horas: $640.000  
8 horas: $700.000

Después de 8 horas:

Valor configurable.

Referencia inicial:

$100.000/hora adicional.

IMPORTANTE:

Las tarifas superiores a 4 horas todavía pueden modificarse.

Por eso deben vivir en configuración y no estar hardcodeadas.

---

# 11. CANTIDAD DE TÉCNICOS

Regla inicial:

Hasta 10 gafas:

**1 técnico obligatorio**

Para más de 10 gafas:

El sistema debe poder requerir más personal.

Como regla inicial para desarrollo:

3–10 gafas = 1 técnico.

11–15 gafas = 2 técnicos.

Sin embargo, esta regla debe quedar configurable porque posteriormente podemos determinar que ciertos tipos de experiencia requieren diferente relación técnico/equipos.

Modelo sugerido:

StaffRule

- min_equipment
- max_equipment
- technicians_required
- product_category
- active

---

# 12. CÁLCULO DE COTIZACIÓN

La lógica básica será:

EQUIPMENT COST  
+

TECHNICAL STAFF COST  
+

TRANSPORT  
+

OPTIONAL SERVICES

=

TOTAL QUOTE

Ejemplo:

Cliente solicita:

3 Meta Quest 3  
4 horas  
Bogotá

Hardware:

$660.000

Técnico:

$400.000

Subtotal:

$1.060.000

Más transporte, si aplica.

---

# 13. CÓMO MOSTRAR EL PRECIO AL CLIENTE

Aunque internamente hardware y técnico deben estar separados, comercialmente queremos comunicar una solución.

Por ejemplo:

### 3 Meta Quest 3

Hasta 4 horas

**Desde $1.060.000**

Incluye:

- 3 Meta Quest 3;
- controles;
- cargadores;
- configuración;
- técnico durante la operación;
- soporte técnico.

Evitar comunicar:

“Alquiler $660.000 + técnico obligatorio $400.000”.

La interfaz debe transmitir que se está contratando una experiencia operada.

Sin embargo, internamente el quote debe mantener los conceptos separados.

---

# 14. TRANSPORTE

El transporte todavía NO tiene una tarifa definitiva.

Por lo tanto debe quedar como variable configurable.

Crear:

TransportZone

Campos:

- id
- name
- base_price
- active

Inicialmente:

Bogotá → tarifa pendiente de definir.

Fuera de Bogotá → cotización manual.

No inventar valores definitivos en esta etapa.

El administrador debe poder cambiar el precio posteriormente.

---

# 15. DURACIÓN DEL EVENTO

La reserva debe preguntar:

**¿Cuánto tiempo necesitas los equipos?**

Opciones iniciales:

4 horas  
5 horas  
6 horas  
7 horas  
8 horas  
Más de 8 horas

Default:

4 horas.

Para “Más de 8 horas”:

No calcular automáticamente todavía si no existe una regla.

Enviar a:

**Cotización personalizada.**

---

# 16. FECHA

Solicitar:

Fecha del evento.

Idealmente también:

Hora de inicio.

Campos:

event_date  
start_time  
duration_hours

Con estos datos se calcula:

end_time.

---

# 17. DISPONIBILIDAD

Antes de mostrar una reserva como disponible, consultar:

inventario total

menos:

- RESERVED
- IN_USE
- MAINTENANCE
- OUT_OF_SERVICE

y además revisar reservas existentes para la fecha/hora solicitada.

Ejemplo:

Quest 3 total:

15.

Evento A tiene reservados:

10.

Para el mismo horario:

Disponible:

5.

El sistema NO debe permitir reservar 6.

---

# 18. BUFFER ENTRE EVENTOS

No debemos asumir que un visor puede salir de un evento e inmediatamente ir a otro.

Preparar el sistema para manejar:

**buffer_before**

y

**buffer_after**

por reserva/producto.

Esto permitirá agregar posteriormente tiempo para:

- transporte;
- carga;
- limpieza;
- revisión;
- actualización;
- preparación.

Los valores pueden empezar en configuración y modificarse posteriormente.

---

# 19. FLUJO DEL CLIENTE

Flujo recomendado:

## Paso 1 — Equipo

“¿Qué equipos necesitas?”

Meta Quest 2  
Meta Quest 3

---

## Paso 2 — Cantidad

“¿Cuántos equipos necesitas?”

Selector.

Mínimo:

3.

Máximo:

inventario disponible.

Mostrar:

“15 disponibles”

o la cantidad correspondiente según fecha.

---

## Paso 3 — Fecha

“¿Cuándo es tu evento?”

Date picker.

---

## Paso 4 — Duración

“¿Cuánto dura tu evento?”

4 h  
5 h  
6 h  
7 h  
8 h  
Más de 8 h

---

## Paso 5 — Ubicación

Ciudad.

Dirección del evento.

Inicialmente:

Bogotá.

Si está fuera de Bogotá:

marcar como “requiere revisión logística”.

---

## Paso 6 — Servicios / contenido

Preparar arquitectura para agregar:

- contenido VR;
- casting a pantalla;
- TV;
- montaje especial;
- desarrollo personalizado;
- branding;
- experiencias interactivas.

No todos deben implementarse en este Sprint.

---

## Paso 7 — Cotización

Mostrar resumen:

META QUEST 3

Cantidad: 5  
Duración: 4 horas  
Fecha: XX  
Técnicos incluidos: 1

Precio:

$X

Transporte:

$X / por confirmar

TOTAL:

$X

---

# 20. DATOS DEL CLIENTE

Solicitar:

Nombre  
Empresa  
Email  
Teléfono / WhatsApp  
Ciudad  
Dirección del evento  
Notas

Opcional:

NIT.

---

# 21. CALL TO ACTION

CTA principal:

**SOLICITAR RESERVA**

Alternativa:

**COTIZAR AHORA**

Evitar decir inicialmente:

“Comprar”.

Estamos vendiendo un servicio de alquiler.

---

# 22. DIFERENCIA ENTRE COTIZACIÓN Y RESERVA

Es fundamental separar ambos conceptos.

## QUOTE

Una cotización todavía NO bloquea inventario.

## RESERVATION

Una reserva confirmada SÍ bloquea inventario.

Estados sugeridos:

DRAFT  
QUOTE_SENT  
PENDING_CONFIRMATION  
CONFIRMED  
IN_PROGRESS  
COMPLETED  
CANCELLED

---

# 23. BLOQUEO DE INVENTARIO

Solamente bloquear inventario cuando:

status = CONFIRMED.

Una solicitud o cotización no debe bloquear automáticamente equipos.

Sin embargo, preparar arquitectura para incorporar posteriormente:

**temporary_hold**

por ejemplo:

15–30 minutos durante un checkout/pago.

No es obligatorio implementar temporary hold todavía.

---

# 24. ANTICIPO

Política comercial inicial propuesta:

**50% para confirmar la reserva.**

**50% restante antes del evento/despacho.**

El sistema debe guardar:

subtotal  
deposit_percentage  
deposit_amount  
balance_due  
payment_status

Estados de pago:

UNPAID  
PARTIALLY_PAID  
PAID  
REFUNDED

No es necesario integrar pasarela de pagos todavía si eso aumenta demasiado el scope del Sprint.

Pero dejar la arquitectura preparada.

---

# 25. CANCELACIONES

Crear estructura configurable.

Referencia inicial:

Más de 7 días antes:

permitir reprogramación / política flexible.

Entre 3 y 7 días:

penalidad configurable.

Menos de 72 horas:

penalidad configurable.

Mismo día / no-show:

hasta 100%.

IMPORTANTE:

Estas políticas todavía no están completamente cerradas comercialmente.

No hardcodear porcentajes definitivos.

---

# 26. DAÑOS Y RESPONSABILIDAD

Aunque los técnicos acompañan los equipos, necesitamos registrar incidentes.

Crear:

Incident

Campos sugeridos:

id  
reservation_id  
asset_id  
type  
description  
estimated_cost  
final_cost  
photos  
status  
created_at

Tipos:

DAMAGE  
LOSS  
THEFT  
ACCESSORY_LOSS  
OTHER

---

# 27. CONTENIDO VR

No asumir que cualquier juego comprado puede utilizarse comercialmente.

Crear estructura:

VRExperience

Campos:

name  
description  
quest_2_compatible  
quest_3_compatible  
commercial_use_status  
license_cost  
licenses_available  
active

commercial_use_status:

VERIFIED  
PENDING_REVIEW  
NOT_ALLOWED

No mostrar como disponible comercialmente una experiencia marcada:

PENDING_REVIEW

o

NOT_ALLOWED.

---

# 28. ADMINISTRADOR

Sprint 2 necesita una administración sencilla.

El administrador debe poder ver:

### Dashboard

Solicitudes nuevas  
Cotizaciones enviadas  
Reservas próximas  
Equipos reservados  
Equipos disponibles  
Equipos en mantenimiento

---

# 29. GESTIÓN DE COTIZACIONES

Tabla:

Quote #

Cliente

Empresa

Fecha evento

Producto

Cantidad

Duración

Total

Estado

Fecha creación

Acciones:

Ver  
Editar  
Enviar / marcar enviada  
Convertir en reserva  
Cancelar

---

# 30. GESTIÓN DE RESERVAS

Mostrar calendario o lista.

Cada reserva:

Cliente  
Evento  
Fecha  
Horario  
Ubicación  
Equipos  
Cantidad  
Técnicos  
Estado de pago  
Estado de reserva

---

# 31. GESTIÓN DE INVENTARIO

Página:

Inventory

Filtros:

Quest 2  
Quest 3  
Disponible  
Reservado  
Evento  
Mantenimiento

Cada equipo debe mostrar:

Código interno  
Serial  
Modelo  
Estado  
Última reserva  
Próxima reserva  
Notas

---

# 32. PERSONAL

Crear entidad:

Technician

Campos:

id  
name  
phone  
email  
active  
internal_cost_4h  
internal_cost_8h  
notes

IMPORTANTE:

$400.000 es actualmente la **tarifa comercial al cliente por técnico hasta 4 horas**.

No confundir con el costo interno que RENTATECH paga al técnico.

Ese costo todavía debe definirse.

---

# 33. ASIGNACIÓN DE TÉCNICOS

Una reserva debe poder tener uno o varios técnicos asignados.

ReservationTechnician:

reservation_id  
technician_id  
start_time  
end_time  
internal_cost  
client_price

Esto permitirá posteriormente calcular rentabilidad real.

---

# 34. RENTABILIDAD

Preparar desde ahora los campos necesarios para calcular:

Revenue

menos:

Technician cost  
Transport cost  
Content licenses  
Other direct costs

=

Gross Margin

No necesitamos todavía un módulo financiero completo.

Pero NO diseñar una base de datos que impida hacerlo después.

---

# 35. QUOTE SNAPSHOT

Muy importante:

Cuando se genera una cotización, guardar un snapshot de los precios utilizados.

Si mañana cambiamos Quest 3 de precio, una cotización enviada ayer NO debe cambiar.

Guardar en QuoteItem:

description  
quantity  
unit_price  
total

No recalcular cotizaciones históricas con precios nuevos.

---

# 36. NUMERACIÓN

Crear identificadores legibles.

Ejemplo:

Quote:

RT-Q-0001

Reservation:

RT-R-0001

Incident:

RT-I-0001

---

# 37. NOTIFICACIONES

Cuando alguien solicita una reserva:

Generar notificación interna.

Preparar arquitectura para:

Email.

Posteriormente:

WhatsApp.

Mensaje al cliente:

“Hemos recibido tu solicitud.”

No decir:

“Tu reserva está confirmada”

hasta que realmente esté confirmada.

---

# 38. EXPERIENCIA DE USUARIO

La filosofía de RENTATECH debe mantenerse:

- moderna;
- limpia;
- rápida;
- tecnológica;
- premium;
- pocos pasos;
- poca fricción;
- información clara.

Evitar formularios enormes.

Idealmente utilizar:

stepper / wizard.

Equipo → Cantidad → Fecha → Duración → Ubicación → Datos → Cotización.

---

# 39. MOBILE FIRST

El cotizador debe funcionar perfectamente desde celular.

Los controles de:

cantidad  
fecha  
duración

deben ser fáciles de utilizar con touch.

---

# 40. REGLAS DE NEGOCIO CONFIRMADAS

Estas decisiones YA están tomadas:

**Inventario**

14 Meta Quest 2.

15 Meta Quest 3.

**Cantidad mínima**

3 gafas.

**Técnico**

Obligatorio.

**Tarifa técnico**

$400.000 hasta 4 horas.

**Custodia**

Los equipos deben permanecer acompañados/supervisados por personal RENTATECH durante el servicio.

**Mercado**

Principalmente B2B/eventos.

**Moneda**

COP.

**Precio**

Debe poder configurarse desde administración.

---

# 41. VARIABLES TODAVÍA POR DEFINIR

NO tomar decisiones irreversibles sobre:

- transporte Bogotá;
- costo interno del técnico;
- tarifa exacta 5–8 horas;
- horas adicionales;
- política final de cancelación;
- valor/garantía por daños;
- buffer logístico;
- contenido VR disponible;
- licencias comerciales;
- técnicos requeridos por cantidad en escenarios especiales;
- impuestos;
- integración de pagos.

Todas deben ser configurables.

---

# 42. MODELO DE DATOS PRINCIPAL

Entidades mínimas sugeridas:

Product

Asset

PricingTier

Customer

Quote

QuoteItem

Reservation

ReservationItem

Technician

ReservationTechnician

TransportZone

VRExperience

Incident

Settings

Payment

La arquitectura debe permitir agregar posteriormente:

TVs  
LED  
Hologramas  
Computadores  
Tablets  
Simuladores  
Proyectores  
Otros equipos tecnológicos

sin reconstruir el sistema.

---

# 43. CRITERIOS DE ACEPTACIÓN DEL SPRINT 2

Sprint 2 se considera terminado cuando:

1. Puedo registrar 14 Quest 2 y 15 Quest 3.

2. Puedo cambiar su estado individualmente.

3. Un cliente puede seleccionar un producto.

4. No puede pedir menos de 3.

5. No puede pedir más del inventario disponible.

6. Puede seleccionar fecha.

7. Puede seleccionar duración.

8. El sistema calcula el alquiler.

9. Agrega automáticamente técnico obligatorio.

10. Calcula cantidad de técnicos según regla configurable.

11. Puede agregar transporte.

12. Genera una cotización.

13. La cotización queda guardada.

14. La cotización tiene número único.

15. Desde administración puedo verla.

16. Puedo convertir una cotización en reserva.

17. Una reserva confirmada bloquea inventario.

18. Otra cotización para el mismo horario ve el inventario restante.

19. Puedo cancelar una reserva.

20. Al cancelarla, el inventario vuelve a estar disponible.

21. Puedo asignar técnicos.

22. Puedo ver próximas reservas.

23. Puedo modificar precios sin tocar código.

24. Las cotizaciones históricas mantienen sus precios originales.

25. Todo funciona correctamente en desktop y mobile.

---

# 44. PRIORIDAD DE DESARROLLO

## P0 — OBLIGATORIO

Inventario  
Disponibilidad  
Cantidad mínima  
Pricing Engine  
Técnico obligatorio  
Cotizaciones  
Reservas  
Bloqueo de inventario  
Panel administrativo básico

## P1 — IMPORTANTE

Asignación de técnicos  
Transporte configurable  
Estados de pago  
Dashboard  
Notificaciones por email  
Incidentes

## P2 — DESPUÉS

Pasarela de pagos  
WhatsApp  
Firma digital  
Contratos automáticos  
Contenido VR avanzado  
Upsells  
Reportes financieros  
Temporary holds  
Automatización logística

---

# 45. PRINCIPIO DEL SPRINT

No construir complejidad innecesaria.

Sprint 2 debe resolver principalmente esta pregunta:

**“Si mañana entra una solicitud de 8 Meta Quest 3 para un evento de 6 horas el próximo jueves, ¿puedo saber inmediatamente si tengo disponibilidad, cuánto cobrar, cuántos técnicos necesito y convertir esa cotización en una reserva que bloquee correctamente el inventario?”**

Si la respuesta es sí, Sprint 2 cumplió su objetivo.

---

# 46. INSTRUCCIÓN PARA CODEX

Antes de implementar:

1. Revisar la arquitectura actual del proyecto.
2. Reutilizar componentes, estilos y estructura existentes.
3. No reconstruir Sprint 1.
4. Mantener el sistema visual actual y el brandbook.
5. Evaluar las migraciones necesarias.
6. Presentar brevemente el plan de implementación.
7. Implementar primero P0.
8. Ejecutar pruebas del flujo completo.
9. No inventar reglas comerciales que aparezcan marcadas como pendientes.
10. Si una decisión de negocio no está definida, convertirla en configuración o dejarla preparada para configuración posterior.

Al finalizar Sprint 2 probar como mínimo:

### Test A

3 Quest 3  
4 horas  
Bogotá.

Debe calcular:

Hardware: $660.000  
Técnico: $400.000

Subtotal antes de transporte:

**$1.060.000**

### Test B

10 Quest 3  
4 horas.

Hardware:

$2.000.000

Técnico:

$400.000

Subtotal antes de transporte:

**$2.400.000**

### Test C

Intentar reservar 2 Quest 3.

Resultado:

**No permitido.**

### Test D

Reserva confirmada de 10 Quest 3.

Nueva solicitud simultánea.

Disponibilidad Quest 3:

**5 unidades.**

### Test E

Reserva confirmada de 15 Quest 3.

Nueva solicitud simultánea.

Resultado:

**Sin disponibilidad.**

### Test F

Cancelar la reserva anterior.

Disponibilidad:

**15 unidades nuevamente.**

---

## RESULTADO ESPERADO

Al terminar este Sprint, RENTATECH debe dejar de ser simplemente una landing que captura leads y empezar a comportarse como una verdadera plataforma de alquiler:

**INVENTARIO → DISPONIBILIDAD → COTIZACIÓN → RESERVA → OPERACIÓN.**

La prioridad es mantenerlo simple y administrable para que el negocio pueda comenzar a operar y validar demanda antes de desarrollar automatizaciones más complejas.