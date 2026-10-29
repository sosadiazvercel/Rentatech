# RENTATECH: marca y revisión de contenido

Fuente de marca: RENTATECH_Brandbook_v2.0.pdf, suministrado por el usuario (20 páginas). Referencia original en C:/Users/user/Downloads. Se respeta la fuente sin modificarla. El Plan Maestro sigue gobernando la operación y el alcance funcional.

## Decisiones aplicadas

- Marca pública RENTATECH; RENTA en negro y TECH en azul. Wordmark tipográfico basado en la guía; sustituible por el vector oficial cuando se entregue.
- Azul #0071E3, negro #0A0A0A, blanco #FFFFFF, superficies #F5F5F7 y gris de marca #86868B. Texto secundario pequeño #626267 para contraste legible. Tipografía de sistema con Inter como primera opción, sin dependencia remota de fuentes.
- Slogan: Tecnología cuando la necesitas. Tono sencillo, centrado en el uso y la experiencia.
- Eliminado Explora VR de la cabecera; catálogo accesible desde las tarjetas.
- Aviso de soporte en Bogotá y cotización a medida para otras ciudades. La ciudad sigue siendo libre y el servidor sigue enviando excepciones a revisión.
- Opciones de contenido comprensibles, con explicación contextual. Se conservan los valores unknown/client_provided/games/custom para no alterar solicitudes y reglas históricas.
- Hero con persona jugando en VR, explicación de gafas/controles y usos: formación, activaciones y juegos. Los modelos quedan como detalles del equipo.
- Fotografías reales de referencia reemplazan todos los visores dibujados. No se generan ni alteran sensores, logos o geometría. Las fotos no representan nuestro inventario ni casos propios.
- Casos de éxito: tres tarjetas de muestra con descripción y vista ampliada en un diálogo. Reproductor Vimeo al incorporar enlaces reales; sin conexiones a Vimeo hasta abrir un video. No se inventaron clientes, videos, resultados ni testimonios.

## Medios y licencias

Créditos públicos en /creditos. Archivos locales en public/images; el optimizador de Next entrega versiones adaptadas.

| Archivo | Fuente / autor | Licencia |
|---|---|---|
| vr-experience.jpg | https://www.pexels.com/photo/a-woman-standing-near-a-desk-playing-with-a-vr-6615083/ — Tima Miroshnichenko | https://www.pexels.com/license/ |
| meta-quest-2.jpg | https://commons.wikimedia.org/wiki/File:Oculus_Quest_II_(50844634326).jpg — Maximilian Prandstätter | https://creativecommons.org/licenses/by/2.0/ |
| meta-quest-3.jpg | https://commons.wikimedia.org/wiki/File:Meta_Quest_3_front_View.jpg — Roy.wonder.cohen | https://creativecommons.org/licenses/by-sa/4.0/ |

La escena del hero muestra uso de VR con un modelo distinto a los dos modelos del catálogo; no se etiqueta como Meta Quest 2/3 y se identifica como referencia. Para la versión comercial se recomienda fotografía propia de una experiencia con el inventario real. No implica respaldo de las personas fotografiadas ni de Meta. Se adapta el tamaño y encuadre de visualización sin cambiar el producto.

## Incorporar casos reales

Editar src/content/success-cases.ts. Cada tarjeta contiene id, title, description y vimeoUrl. Reemplazar el texto de muestra por la descripción del caso real (objetivo, ejecución y resultado verificado) y pegar el enlace HTTPS de Vimeo. Se admiten enlaces vimeo.com/ID, vimeo.com/ID/HASH y player.vimeo.com/video/ID?h=HASH. Activar permisos de inserción para el dominio del sitio en Vimeo y añadir allí subtítulos. No se inventan enlaces: mientras vimeoUrl esté vacío, la tarjeta y el diálogo indican que son de muestra. El diálogo se cierra con el botón, Escape o el fondo exterior; al cerrarse se desmonta el reproductor para detener el video. Obtener autorización para publicar el material de cada caso antes de sustituir los placeholders.

## Alcance preservado

No se habilitan pagos, reservas, cotización automática, mensajes salientes ni nuevas reglas comerciales. Permanecen la advertencia de prueba, precios simulados y revisión manual de solicitudes. Las especificaciones originales en sources y el paquete Sprint 0 no fueron modificados.

## Verificación de esta revisión

Compilación y TypeScript correctos, lint sin errores y 4 pruebas de navegador aprobadas: páginas móviles, selección de equipo, envío y seguimiento en CRM, controles de acceso. Capturas de escritorio, móvil y formulario revisadas visualmente. Las pruebas unitarias y SQL previas no se repitieron porque no se modificó la lógica de negocio ni la base de datos.
