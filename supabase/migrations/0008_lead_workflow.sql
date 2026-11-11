-- Commercial follow-up is separate from inventory allocation and payment movements.
ALTER TABLE public.lead DROP CONSTRAINT IF EXISTS lead_stage_check;
ALTER TABLE public.lead DROP CONSTRAINT IF EXISTS lead_check;
ALTER TABLE public.lead DROP CONSTRAINT IF EXISTS lost_requires_reason;
UPDATE public.lead SET stage=CASE stage WHEN 'qualified' THEN 'new' WHEN 'won' THEN 'confirmed' ELSE stage END;
ALTER TABLE public.lead ADD CONSTRAINT lead_stage_check CHECK(stage IN ('new','quoted','lost','awaiting_payment','confirmed','completed'));
ALTER TABLE public.lead ADD COLUMN payment_url text NOT NULL DEFAULT '', ADD COLUMN payment_reference text NOT NULL DEFAULT '', ADD COLUMN stage_version integer NOT NULL DEFAULT 0;

CREATE TABLE public.lead_attachment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lead_id uuid NOT NULL REFERENCES public.lead(id),
 filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 180),
 data bytea NOT NULL CHECK(octet_length(data) BETWEEN 1 AND 5242880),
 digest text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(lead_id,digest)
);
CREATE INDEX lead_attachment_lead_idx ON public.lead_attachment(lead_id,created_at DESC);
ALTER TABLE public.lead_attachment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_attachment FROM anon,authenticated;
ALTER TABLE public.lead ADD COLUMN attachment_id uuid REFERENCES public.lead_attachment(id);
ALTER TABLE public.unit_allocation ADD COLUMN lead_id uuid REFERENCES public.lead(id);
CREATE INDEX unit_allocation_lead_idx ON public.unit_allocation(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.notification_outbox ALTER COLUMN quote_id DROP NOT NULL;
ALTER TABLE public.notification_outbox ADD COLUMN lead_id uuid REFERENCES public.lead(id),
 ADD COLUMN kind text NOT NULL DEFAULT 'initial_customer',
 ADD COLUMN payload jsonb,
 ADD COLUMN attachment_id uuid REFERENCES public.lead_attachment(id),
 ADD COLUMN event_key text;
CREATE UNIQUE INDEX notification_event_key_idx ON public.notification_outbox(event_key) WHERE event_key IS NOT NULL;
CREATE INDEX notification_lead_idx ON public.notification_outbox(lead_id,created_at);
-- Older attempts used a different template; do not retry a different body with their provider key.
UPDATE public.notification_outbox SET status='review_required',locked_until=NULL,
 last_error='Envío anterior al cambio de plantillas. Revisa el proveedor antes de reenviar.'
 WHERE attempts>0 AND status<>'sent' AND payload IS NULL;
-- Existing receipts remain intact; pending customer emails gain an independent admin message.
INSERT INTO public.notification_outbox(quote_id,channel,kind,event_key)
 SELECT q.id,'email','initial_admin','quote-admin/'||q.id FROM public.quote q
 WHERE EXISTS(SELECT 1 FROM public.notification_outbox n WHERE n.quote_id=q.id AND n.status<>'sent');
