-- Small, normalized catalog photos stay with the database across deployments.
CREATE TABLE public.equipment_photo (
 equipment_id uuid PRIMARY KEY REFERENCES public.equipment(id) ON DELETE CASCADE,
 data bytea NOT NULL CHECK (octet_length(data) <= 2097152),
 version text NOT NULL CHECK (version ~ '^[a-f0-9]{64}$'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_photo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipment_photo FROM anon, authenticated;
ALTER TABLE public.notification_outbox
 ADD COLUMN attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN attempted_at timestamptz,
 ADD COLUMN locked_until timestamptz,
 ADD COLUMN sent_at timestamptz,
 ADD COLUMN provider_id text,
 ADD COLUMN last_error text;
