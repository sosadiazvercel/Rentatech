# Instrucción de arranque de Sprint 1

Implementar únicamente S1-01 a S1-08 de `docs/08-backlog.md`, siguiendo estas especificaciones y dando prioridad al Plan Maestro. Objetivo: base ejecutable, páginas públicas y captación/CRM con datos ficticios, lista para incorporar motor de reservas y pricing en el siguiente incremento.

Leer README y documentos 00–04, 07 y 08 antes de cambiar archivos. Consultar 05–06 para que el esquema soporte las reglas, sin implementar aún el motor de pricing. No modificar `sources/` ni sustituir archivos sincronizados del proyecto.

1. Crear el repo de aplicación en un directorio de desarrollo separado del material sincronizado. Usar nombre `03_ALQUILER_TECH`; importar docs/config/plantillas como referencia. No crear remoto ni publicar sin encargo correspondiente.
2. Registrar versiones exactas y lockfile. Crear `.env.example` sin secretos, script de migración y datos ficticios solo en desarrollo. No activar pagos, Ads o mensajes reales.
3. Implementar esquema, permisos y páginas/rutas de S1. NexoKit es marca provisional. Señalar cualquier precio fixture como simulación.
4. Conectar captación y CRM; casos fuera de estándar producen lead asistido. Ningún botón de Sprint 1 debe aparentar una reserva real completada.
5. Probar validación del servidor, deduplicación, acceso por rol y ruta formulario → CRM. Entregar instrucciones ejecutables de instalación, configuración y pruebas que correspondan al software construido.
6. Reportar historias terminadas, evidencia de verificación y G01–G07 pendientes. No inventar costos, seriales, NIT, técnicos disponibles ni políticas aprobadas para desbloquear S2.

No incorporar funcionalidades POST ni adelantar S2 por conveniencia. Si los responsables aportan evidencia G01–G07, registrar cambios en versiones de reglas; la programación del motor sigue siendo alcance de S2, no de S1.
