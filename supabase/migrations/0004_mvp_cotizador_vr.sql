-- MVP Cotizador VR: rangos por dia, operador obligatorio, transporte Bogota y contenido.
UPDATE pricing_version SET active=false WHERE active;

WITH version AS (
 INSERT INTO pricing_version(version,mode,rules,rules_hash,active)
 VALUES (
  'mvp-cotizador-vr-oct-2026',
  'sandbox',
  '{
   "minimumQuantity":3,
   "quoteValidityHours":168,
   "tiers":[
    {"product":"QUEST2","min":3,"max":4,"unit":150000},
    {"product":"QUEST2","min":5,"max":9,"unit":135000},
    {"product":"QUEST2","min":10,"max":15,"unit":120000},
    {"product":"QUEST3","min":3,"max":4,"unit":280000},
    {"product":"QUEST3","min":5,"max":9,"unit":250000},
    {"product":"QUEST3","min":10,"max":15,"unit":220000}
   ],
   "staffRules":[{"min":3,"max":15,"count":1}],
   "technicianRates":{"4":300000,"5":300000,"6":300000,"7":300000,"8":300000},
   "durationFactors":{"4":1,"5":1,"6":1,"7":1,"8":1},
   "extraHourRate":50000,
   "contentConfig":{"upToQuantity":10,"upToPrice":250000,"abovePrice":350000},
   "bufferBeforeMinutes":60,
   "bufferAfterMinutes":45,
   "taxPercent":0,
   "depositPercent":50,
   "cancellationPolicy":"MVP: cotizacion sujeta a validacion final de disponibilidad, logistica y contenido.",
   "damagePolicy":"MVP: danos, perdidas y accesorios se revisan manualmente antes de confirmar."
  }',
  'mvp-cotizador-vr-oct-2026',
  true
 )
 RETURNING id
)
UPDATE rental_settings SET pricing_version_id=version.id FROM version WHERE rental_settings.id=true;

UPDATE transport_zone SET base_price=180000 WHERE lower(name) IN ('bogota','bogotá');
