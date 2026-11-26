// Paste into Google Apps Script. Set RENTATECH_URL and
// RENTATECH_CALENDAR_ID in Project Settings > Script properties.
function syncRentatechCalendar() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const properties = PropertiesService.getScriptProperties();
    const url = properties.getProperty('RENTATECH_URL');
    const identity = ScriptApp.getIdentityToken();
    const calendarId = properties.getProperty('RENTATECH_CALENDAR_ID');
    if (!url || !calendarId) throw new Error('Completa la URL y el ID del calendario en las propiedades del proyecto.');
    if (!identity) throw new Error('Agrega el manifiesto appsscript.json y autoriza los permisos de Google.');
    if (!/^https:\/\//.test(url)) throw new Error('La URL debe usar HTTPS.');
    const response = UrlFetchApp.fetch(url.replace(/\/$/, '') + '/api/v1/calendar-sync', {
      headers: {Authorization: 'Bearer ' + identity}, muteHttpExceptions: true,
    });
    if (response.getResponseCode() !== 200) throw new Error('No se pudo consultar Rentatech: ' + response.getResponseCode() + ' - ' + response.getContentText());
    const payload = JSON.parse(response.getContentText());
    if (!Array.isArray(payload.events)) throw new Error('Respuesta inválida; no se modificó el calendario.');
    // Validate the entire snapshot before changing or removing any events.
    payload.events.forEach(function(item) {
      if (!item.id || !item.title || !['manual', 'booking'].includes(item.source) ||
          !isFinite(Date.parse(item.start_at)) || !isFinite(Date.parse(item.end_at)) ||
          Date.parse(item.end_at) <= Date.parse(item.start_at)) throw new Error('Evento inválido.');
    });
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) throw new Error('No tienes acceso al calendario indicado.');
    // Scope ownership to the target calendar so changing calendars is safe.
    const prefix = 'rentatech:' + calendarId + ':';
    const seen = {};
    payload.events.forEach(function(item) {
      const key = prefix + item.source + ':' + item.id;
      const marker = '[Rentatech:' + item.source + ':' + item.id + ']';
      const start = new Date(item.start_at), end = new Date(item.end_at);
      const storedId = properties.getProperty(key);
      let event = storedId ? calendar.getEventById(storedId) : null;
      // Recover an event created before an interrupted run saved its ID.
      if (!event) event = calendar.getEvents(start, end, {search: marker}).find(function(candidate) {
        return candidate.getDescription().includes(marker);
      });
      const description = (item.notes || '') + '\n\n' + marker;
      if (!event) event = calendar.createEvent(item.title, start, end, {
        location: item.location || '', description: description,
      });
      else {
        event.setTitle(item.title);
        event.setTime(start, end);
        event.setLocation(item.location || '');
        event.setDescription(description);
      }
      properties.setProperty(key, event.getId());
      seen[key] = true;
    });
    // Remove only events owned by this integration, never personal events.
    const saved = properties.getProperties();
    Object.keys(saved).filter(function(key) {return key.startsWith(prefix) && !seen[key];}).forEach(function(key) {
      const event = calendar.getEventById(saved[key]);
      if (event) event.deleteEvent();
      properties.deleteProperty(key);
    });
  } finally {lock.releaseLock();}
}

// Prints only public setup information, never the identity credential.
function showRentatechGoogleAccount() {
  const identity = ScriptApp.getIdentityToken();
  if (!identity) throw new Error('Agrega el manifiesto y autoriza los permisos de Google.');
  const account = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(identity.split('.')[1])).getDataAsString());
  console.log('GOOGLE_CALENDAR_SYNC_EMAIL=' + account.email);
  console.log('GOOGLE_CALENDAR_CLIENT_ID=' + account.aud);
}

function installRentatechTrigger() {
  ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === 'syncRentatechCalendar';
  }).forEach(function(trigger) {ScriptApp.deleteTrigger(trigger);});
  ScriptApp.newTrigger('syncRentatechCalendar').timeBased().everyMinutes(5).create();
}
