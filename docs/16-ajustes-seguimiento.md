# Ajustes del seguimiento y catálogo

- Nuevas imágenes de Meta Quest 2 y 3 en `public/images/meta-quest-2-headset.png` y `public/images/meta-quest-3-headset.png`. PNG con canal alfa, sin controles, usadas en portada, catálogo y vista previa del administrador. Los archivos nuevos evitan mostrar imágenes antiguas desde la caché.
- Móvil: el menú conserva un acceso a cotizar; las acciones del encabezado de escritorio siguen ocultas.
- Teléfono: selector de país, bandera y prefijo dentro del mismo control que el número nacional. Colombia es la opción inicial y se conserva el formato internacional enviado al servidor.
- Inventario: el nombre del modelo abre su producto seleccionado en el editor administrativo.
- Solicitudes: colores distintos para Nueva solicitud, Cotizado, Por pagar, Confirmado, Finalizado y Perdido.
- El valor estimado es de solo lectura en Por pagar y Confirmado. La API rechaza cambios al valor en estas etapas y al entrar en ellas.
- Confirmado permite seleccionar técnicos de Personal y exige la cantidad requerida. La asignación comprueba actividad y conflictos de horario dentro de la transacción. Se crea una reserva con equipos y técnicos, visible en Operaciones → Reservas. El cierre libera ambas asignaciones.
- Finalizado bloquea todos los campos del seguimiento, retira el botón de guardar y rechaza cualquier modificación en la API.

Las solicitudes confirmadas con el flujo anterior se incorporan a Reservas al guardar la asignación del técnico. Las asignaciones manuales anteriores se sustituyen dentro de la misma transacción para evitar duplicar el bloqueo de inventario.

## Calendario

El botón Calendario abre `/admin/calendario`, protegido por el acceso del equipo. Mientras no haya calendario compartido, presenta un aviso.

Cuando esté creado, configurar `GOOGLE_CALENDAR_ID` con su ID (Google Calendar → Configuración → Integrar el calendario). Compartirlo con las cuentas del equipo y conceder los permisos adecuados en Google. La vista utiliza la zona horaria America/Bogota y ocupa un área grande.

Esta entrega no crea calendarios ni sincroniza eventos. Las reservas se registran manualmente en Google Calendar. La confirmación conserva la referencia de pago; los importes efectivamente recibidos se siguen registrando en Operaciones, sin inferir un importe desde esa referencia.

## Imágenes

Preparadas con la herramienta integrada ImageGen, a partir de las imágenes existentes. Prompt por modelo: aislar únicamente el visor Meta Quest correspondiente, conservar materiales y sensores, mostrar correas completas en vista frontal de tres cuartos, eliminar controles, fondo y sombras, y entregar PNG transparente sin texto. Son imágenes ilustrativas del producto.

Las banderas SVG se guardan localmente en `public/images/flags/`, obtenidas de FlagCDN, para evitar depender del soporte de emojis del dispositivo.

## Verificación

`npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint`, `npm run build` y pruebas de navegador de `platform-adjustments.spec.ts` y `quote-reference.spec.ts`.

El trabajo queda en el proyecto local; requiere desplegarse para aparecer en el sitio publicado.

La prueba heredada de ingreso de operador en `product-management.spec.ts` usa `LOCAL_OPERATOR_*`, que el acceso básico actual no admite. Ese caso falla por credenciales; no se modificó la autenticación en estos ajustes. El recorrido de edición de productos con administrador se verificó por separado.
