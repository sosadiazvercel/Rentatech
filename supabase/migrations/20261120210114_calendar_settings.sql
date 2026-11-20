-- Keep the shared calendar connection editable by administrators instead of
-- coupling a business setting to the deployment environment.
ALTER TABLE public.rental_settings
 ADD COLUMN google_calendar_id text NOT NULL DEFAULT '',
 ADD CONSTRAINT rental_settings_google_calendar_id_valid CHECK (
  length(google_calendar_id) <= 320
  AND google_calendar_id !~ '[[:space:]<>"]'
 );

COMMENT ON COLUMN public.rental_settings.google_calendar_id IS
 'Google Calendar identifier used by the private administration calendar view.';

-- rental_settings was already protected in 0003; repeat the revoke so the new
-- column cannot inherit an accidental client-facing grant in older projects.
ALTER TABLE public.rental_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rental_settings FROM PUBLIC, anon, authenticated;
