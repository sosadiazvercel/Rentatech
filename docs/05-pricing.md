# Pricing v0 y economía de la reserva

## Autoridad y límite

PM §5 fija rangos exploratorios: Quest 2 COP 150–190 mil y Quest 3 COP 250–325 mil por visor/jornada. No define jornada, costos, IVA aplicable, anticipo porcentual ni precio de técnico. Este documento y `config/pricing.v0.sandbox.json` cierran esos huecos **solo para especificar y simular**. Conforme a PM §15, no programar el motor comercial hasta recoger G01–G07 del documento 09. El cálculo manual de referencia aquí no demuestra rentabilidad real.

## Configuración S0

| Concepto | Venta simulada | Costo simulado para margen |
|---|---:|---:|
| Quest 2 / jornada hasta 4 h | 170.000 por visor | Consumibles 8.000 por visor vendido |
| Quest 3 / jornada hasta 4 h | 290.000 por visor | Consumibles 8.000 por visor vendido |
| Hardware por hora adicional | 15% de base por visor | Sin costo adicional de hardware en este modelo |
| Técnico / hasta 4 h | 280.000 por técnico | 180.000 por técnico |
| Técnico / hora adicional | 55.000 por técnico | 35.000 por técnico |
| Transporte Bogotá urbano ida/vuelta | 160.000 por evento | 120.000 por evento |
| Setup y configuración | 120.000 por evento | 60.000 de preparación interna por evento |
| Contenido propio autorizado | 0 | 0 si no necesita licencia/desarrollo |
| Comisión comercial | No recargo | 0 en simulación; registrar real |
| Pasarela | Absorbida, no recargo | 2,65% + 700 por cobro, multiplicado por 1,19 como supuesto histórico PM §17 |

No se presenta la tarifa histórica de Wompi como vigente. Debe sustituirse por la condición de la cuenta real. Precio del anticipo no equivale a ingreso extra; forma parte del total. No incluir desgaste/depreciación como si fuera costo ya medido; registrar reposición y overhead por separado en el análisis económico.

## Fórmula determinista

Valores internos en COP enteros. `R(x)` redondea al peso más cercano con mitades hacia arriba; sin float binario. Duración `h` = horas entre inicio y fin. Estándar exige 0<h≤8, horas enteras en UI; API calcula `e = max(0, ceil(h)-4)` para no infracobrar fracciones importadas. No prorratear jornadas de 1–3 horas.

```text
q = cantidad de visores para asistentes
t = ceil(q / 5)
b = ceil(q / 5)                  # respaldo físico, sin cobro
hardware_base = q * tarifa_modelo
hardware_extra = q * e * R(tarifa_modelo * 1500 / 10000)
tecnicos = t * (280000 + e * 55000)
subtotal = hardware_base + hardware_extra + tecnicos + 160000 + 120000
impuesto = R(subtotal * 1900 / 10000)     # SOLO SIMULACIÓN
total = subtotal + impuesto
anticipo = ceil(total * 5000 / 10000)
saldo = total - anticipo

costo_pasarela = R((anticipo * 265 / 10000 + 700) * 11900 / 10000)
                + R((saldo * 265 / 10000 + 700) * 11900 / 10000)
costos_directos = t * (180000 + e * 35000) + 120000 + 60000
                 + q * 8000 + costo_pasarela + licencias + comision
contribucion = subtotal - costos_directos
margen = contribucion / subtotal
CAC_maximo = contribucion * 0.15
```

Se presupuestan dos cobros online para estimar costo completo; si el saldo real se recibe por otro medio, sustituir su costo en el cierre. El margen se calcula sobre venta antes de impuestos, nunca sobre dinero recibido ni total con IVA. El costo de preparación se resta de manera conservadora adicional a las partidas del PM §6. IVA de venta no es ingreso; tratamiento deducible del IVA de costos pendiente de contador.

El gate compara `contribucion*10000 >= subtotal*5500` sin redondear el porcentaje de pantalla. Si falla, respuesta `manual_review` y sin checkout; no subir precio ni descontar silenciosamente. AOV objetivo 2,5 M no prohíbe pedidos menores. No hay descuentos automáticos ni A/B simultáneo en v0: nuevas pruebas crean versión nueva.

## Casos de referencia

| Caso | Subtotal | Impuesto simulado | Total | Anticipo | Saldo | Contribución estimada | Margen |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5 Quest 3, 4 h | 2.010.000 | 381.900 | 2.391.900 | 1.195.950 | 1.195.950 | 1.532.906 | 76,26% |
| 10 Quest 3, 4 h | 3.740.000 | 710.600 | 4.450.600 | 2.225.300 | 2.225.300 | 2.977.984 | 79,63% |
| 5 Quest 2, 4 h | 1.410.000 | 267.900 | 1.677.900 | 838.950 | 838.950 | 955.422 | 67,76% |
| 5 Quest 3, 6 h | 2.555.000 | 485.450 | 3.040.450 | 1.520.225 | 1.520.225 | 1.987.454 | 77,79% |

Valores de contribución deben cotejarse con `fixtures/pricing-cases.csv`; si una tabla difiere, corregir documentación antes de implementar. Estos márgenes altos reflejan costos asumidos y activos ya existentes; no son resultados del negocio.

## Presentación de la cotización

Mostrar empresa/contacto, fecha, horas, lugar, modelo/cantidad, técnicos, alcance del contenido, respaldo incluido sin cobro, cada línea de precio, impuestos con etiqueta correcta, total, anticipo, saldo y vencimiento. Adjuntar versión de tarifa y políticas. Incluir «La cotización no bloquea fecha; disponibilidad sujeta a validación al reservar». PDF y página deben usar exactamente el mismo snapshot.

Antes de publicar un «desde», indicar jornada y partidas adicionales. El cliente debe conocer total e impuestos antes de pagar. No mostrar impuesto cero cuando el dato es desconocido: deshabilitar cotización pagable hasta configurarlo correctamente.

## Fuera del cálculo v0

Otras ciudades, múltiples días/lugares, mezcla de modelos, cantidades fuera de estándar, horarios especiales, contenido/licencias no verificados, técnico adicional, televisión/casting, conectividad dedicada, producción y personalización → lead asistido. La propuesta humana puede usar las mismas líneas de cotización pero debe aprobar costos, capacidad y condiciones antes de pedir anticipo. Sin checkout automático para Full Experience.
