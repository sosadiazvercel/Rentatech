# Ajustes de la referencia

El inicio usa un hero ancho con margen exterior de 22 px, título serif, fondo negro y selector alineado con el borde derecho de la imagen. Solo se muestra Realidad virtual. Las miniaturas cambian el producto y marcan el seleccionado en verde. El menú incluye flecha, vista previa por producto y cierre con Escape; buscar incluye lupa y filtra el catálogo. Las tarjetas del inicio son compactas.

## Fotos

En `/admin/operaciones`, un administrador puede abrir **Fotos de productos** y reemplazar cada imagen. Se admiten JPG, PNG y WebP hasta 5 MB. El servidor valida y convierte a WebP, conserva transparencia y guarda la imagen en Postgres, sin depender del disco del servidor web. Cada contenido tiene una URL con hash; al reemplazarlo se invalida el layout. La misma imagen alimenta inicio, menú, buscador, catálogo y ficha.

Aplicar `npm run db:migrate` en el entorno de destino antes de desplegar. La migración `0005_product_photos_email.sql` agrega almacenamiento de fotos y campos para el seguimiento de correos. Fue aplicada y probada en la base local.

Los originales JPG se conservaron. Las imágenes de ejemplo se editaron mediante la herramienta integrada ImageGen y se guardaron en `public/images/meta-quest-2-cutout.png` y `public/images/meta-quest-3-cutout.png`. Son ilustraciones de catálogo derivadas de las fotos de ejemplo; el administrador puede sustituirlas por fotografías del inventario real.

Prompts utilizados, con fondo transparente activado:

**Quest 2**

> Edit target: the provided photo of a Meta Quest 2 headset with two ring controllers. Produce a clean ecommerce cutout of this same headset and both controllers. Preserve exact product geometry, four corner sensors and plain white faceplate, cloth strap, controller rings, arrangement and perspective. Remove the tabletop and wall completely. Genuine transparent alpha background with no solid backdrop, no text, no border, no new objects. Product centered filling most of landscape frame, small clean padding. Keep entire headset and both controllers. Neutral white balanced studio illumination and realistic materials, polished but accurate. Will be composited on black website hero and white catalog cards.

**Quest 3**

> Edit target: the provided photo of a Meta Quest 3 headset with two controllers. Create a clean ecommerce product cutout of this same headset and both controllers, preserving real product geometry, the three correct front sensor pills, the fabric strap, exact perspective and arrangement. Remove absolutely all background: monitor, table, cardboard box, room. Transparent alpha background, no text, no border, no added props. Retain entire headset and both controllers; reconstruct only the small cropped edge of the right controller if needed so whole product fits with narrow clean padding. Neutral white balanced studio illumination, realistic surface detail. Output a landscape product cutout, product fills most of frame. This will be composited on a black website hero and white catalog cards.

## Correos

Antes solo se insertaba una fila en `notification_outbox`. Ahora las nuevas solicitudes persistidas intentan enviar un acuse al cliente con copia oculta al equipo. Configurar en el servidor:

- `RESEND_API_KEY`: clave del proveedor.
- `EMAIL_FROM`: remitente de un dominio verificado.
- `EMAIL_NOTIFICATION_TO`: destinatarios internos separados por comas.

Sin esas variables no se llama al proveedor. El resumen de operaciones muestra configuración, intentos, errores y aceptación por el proveedor, con reintento para administradores. **Aceptado** no significa entregado en la bandeja: esa confirmación requiere consultar el proveedor. La implementación usa [claves de idempotencia de Resend](https://resend.com/blog/engineering-idempotency-keys) y evita reintentos automáticos fuera de su ventana segura. Una falla del correo no elimina ni invalida la solicitud guardada. No se enviaron mensajes reales durante las pruebas.

La restricción comercial de producción que ya existía en el cotizador sigue vigente. El flujo de demostración sin base de datos tampoco envía correos.

## Verificación

Se agregaron seis pruebas de integración para permisos de fotos, archivos inválidos, persistencia, transparencia, cambios de URL y estados/reintentos concurrentes de correo, con proveedor simulado. También pasan tres pruebas de navegador: navegación del catálogo, títulos en móvil y carga desde el administrador con verificación de la foto en inicio, catálogo, ficha, menú y buscador. La prueba de carga restaura la imagen anterior al terminar. Pasan las 15 pruebas unitarias, lint, TypeScript y compilación de producción.

La suite anterior de reservas tiene expectativas de precios y reglas distintas de las vigentes en `0004_mvp_cotizador_vr.sql` y `src/lib/rental.ts`: falla en nueve pruebas. No se modificaron precios ni reglas de reservas como parte de este ajuste.

## Segunda ronda de comentarios

- Las fichas de catálogo comienzan con el título y dejan las características para la página del producto. Los botones y enlaces tienen efecto al pasar el cursor. Las flechas de las tarjetas y del menú son SVG.
- El menú y `/vr` ofrecen **Todos**, **Realidad virtual** y **Realidad mixta**. Esta última muestra Quest 3, que ya estaba en el catálogo y tiene passthrough a color. No se inventó un producto que pudiera confundirse con inventario disponible.
- El encabezado móvil ya no muestra el icono de teléfono. Los botones del hero se apilan y el contador queda encima del título sin montarse sobre él.
- El cotizador deshabilita fechas anteriores a la fecha actual de Bogotá en el selector. El servidor conserva su validación de fecha y hora futura. La ciudad se pregunta con equipo y fecha; en el siguiente paso queda solo la dirección o lugar del evento.
- El resumen del precio aparece al lado derecho durante los pasos y se actualiza al cambiar los datos. En móvil aparece debajo de las preguntas y antes de **Solicitar cotización**. Cuando hay valores sin calcular, muestra **Subtotal conocido** y los pendientes, sin presentar la cifra como precio cerrado.
- Se quitaron los enlaces de Wompi de prueba del cotizador y del mensaje de solicitud recibida. El encabezado ofrece **Pagos**, que lleva a una página con el procedimiento actual: primero revisión humana de cotización y disponibilidad. No se presenta ese enlace de prueba como un pago conectado a la reserva.

La disponibilidad se calcula en el servidor según unidades listas y asignaciones que se cruzan con el horario y sus márgenes logísticos. Al guardar la solicitud se valida de nuevo. Esto comprueba capacidad para una fecha, pero una cotización todavía no bloquea inventario; la reserva se confirma después de revisión operativa y registro de pago. El envío del acuse por correo se prueba con proveedor simulado. La configuración real del proveedor sigue pendiente y esta ronda no cambia la administración de cotizaciones ni pagos, conforme a la indicación de posponer esa revisión.
