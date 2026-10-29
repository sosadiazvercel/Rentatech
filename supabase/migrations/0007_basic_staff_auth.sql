ALTER TABLE public.staff_profile ALTER COLUMN auth_user_id DROP NOT NULL;
ALTER TABLE public.staff_profile ADD COLUMN IF NOT EXISTS login_email text;

INSERT INTO public.staff_profile(id,auth_user_id,role,active,login_email)
VALUES('00000000-0000-4000-8000-000000000011',NULL,'admin',true,'admin@sosadiazeventos.com')
ON CONFLICT(id) DO UPDATE SET role='admin',active=true,login_email=EXCLUDED.login_email;

CREATE UNIQUE INDEX IF NOT EXISTS staff_profile_login_email_unique
ON public.staff_profile(lower(login_email)) WHERE login_email IS NOT NULL;

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='staff_profile_login_email_normalized' AND conrelid='public.staff_profile'::regclass) THEN
  ALTER TABLE public.staff_profile ADD CONSTRAINT staff_profile_login_email_normalized
  CHECK(login_email IS NULL OR login_email=lower(trim(login_email)));
 END IF;
END $$;

CREATE TABLE public.staff_session(
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 staff_id uuid NOT NULL REFERENCES public.staff_profile(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_session_expires_at_idx ON public.staff_session(expires_at);
ALTER TABLE public.staff_session ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_session FROM anon,authenticated;
