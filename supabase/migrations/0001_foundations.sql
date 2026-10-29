CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE public.staff_profile (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
 role text NOT NULL CHECK (role IN ('admin','operator')), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.equipment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(code IN ('QUEST2','QUEST3')),
 name text NOT NULL, category text NOT NULL DEFAULT 'vr' CHECK(category='vr'), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.inventory_unit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), equipment_id uuid NOT NULL REFERENCES public.equipment(id), asset_tag text NOT NULL UNIQUE,
 serial text UNIQUE, status text NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','ready','maintenance','quarantine','retired')),
 inspected_at timestamptz, accessories jsonb NOT NULL DEFAULT '[]', is_fixture boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status <> 'ready' OR (inspected_at IS NOT NULL AND (is_fixture OR serial IS NOT NULL)))
);
CREATE TABLE public.customer (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_name text, contact_name text NOT NULL,
 email_normalized text NOT NULL UNIQUE CHECK(email_normalized=lower(trim(email_normalized))), phone_e164 text NOT NULL,
 customer_type text NOT NULL CHECK(customer_type IN ('business','agency','university','private')),
 billing_details jsonb, marketing_consent boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lead (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customer(id),
 owner_user_id uuid REFERENCES public.staff_profile(id), stage text NOT NULL DEFAULT 'new' CHECK(stage IN ('new','qualified','quoted','won','lost')),
 request jsonb NOT NULL, source text NOT NULL, attribution jsonb NOT NULL DEFAULT '{}',
 estimated_value_cop bigint CHECK(estimated_value_cop >= 0), loss_reason text, next_action_at timestamptz,
 privacy_version text NOT NULL, privacy_accepted_at timestamptz NOT NULL, marketing_consent boolean NOT NULL DEFAULT false,
 continuation_token_hash text NOT NULL, continuation_expires_at timestamptz NOT NULL,
 automation_mode text NOT NULL DEFAULT 'human' CHECK(automation_mode IN ('faq','human')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(stage <> 'lost' OR length(trim(loss_reason)) > 0)
);
CREATE INDEX lead_created ON public.lead(created_at DESC);
CREATE INDEX lead_customer ON public.lead(customer_id);
CREATE TABLE public.lead_note (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.lead(id),
 author_user_id uuid NOT NULL REFERENCES public.staff_profile(id), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pricing_version (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version text NOT NULL UNIQUE, mode text NOT NULL CHECK(mode IN ('sandbox','production')),
 rules jsonb NOT NULL, rules_hash text NOT NULL, approved_by uuid REFERENCES public.staff_profile(id), approved_at timestamptz,
 cost_evidence_ref text, active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(mode <> 'production' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND cost_evidence_ref IS NOT NULL))
);
CREATE TABLE public.quote (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.lead(id), version int NOT NULL CHECK(version>0),
 status text NOT NULL CHECK(status IN ('issued','accepted','expired','superseded')), pricing_version_id uuid NOT NULL REFERENCES public.pricing_version(id),
 event_start timestamptz NOT NULL, event_end timestamptz NOT NULL CHECK(event_end > event_start), city text NOT NULL, venue jsonb NOT NULL,
 equipment_id uuid NOT NULL REFERENCES public.equipment(id), quantity int NOT NULL CHECK(quantity>0), attendees int NOT NULL CHECK(attendees>0),
 content_status text NOT NULL, technician_count int NOT NULL CHECK(technician_count>0), backup_count int NOT NULL CHECK(backup_count>0),
 snapshot jsonb NOT NULL, subtotal_cop bigint NOT NULL CHECK(subtotal_cop>=0), tax_cop bigint NOT NULL CHECK(tax_cop>=0),
 total_cop bigint NOT NULL CHECK(total_cop=subtotal_cop+tax_cop), deposit_cop bigint NOT NULL CHECK(deposit_cop BETWEEN 0 AND total_cop),
 expires_at timestamptz NOT NULL, issued_at timestamptz NOT NULL DEFAULT now(), public_token_hash text NOT NULL UNIQUE, policy_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(lead_id,version)
);
CREATE TABLE public.quote_line (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quote(id),
 type text NOT NULL CHECK(type IN ('hardware','extra_hour','technician','transport','setup','content')), description text NOT NULL,
 quantity int NOT NULL CHECK(quantity>0), unit_cop bigint NOT NULL CHECK(unit_cop>=0), total_cop bigint NOT NULL CHECK(total_cop=quantity*unit_cop),
 taxable boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.technician (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, contact text NOT NULL, active boolean NOT NULL DEFAULT true,
 capacity_visors int NOT NULL DEFAULT 5 CHECK(capacity_visors>0), is_fixture boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.technician_window (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), technician_id uuid NOT NULL REFERENCES public.technician(id), period tstzrange NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT isempty(period) AND lower(period) IS NOT NULL AND upper(period) IS NOT NULL AND lower_inc(period) AND NOT upper_inc(period))
);
CREATE TABLE public.booking (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL UNIQUE REFERENCES public.quote(id),
 status text NOT NULL CHECK(status IN ('holding','expired','confirmed','in_service','completed','cancelled','payment_review')),
 hold_expires_at timestamptz, confirmed_at timestamptz, terms_version text NOT NULL, terms_accepted_at timestamptz NOT NULL,
 accepted_contact text NOT NULL, request_key text NOT NULL UNIQUE, public_token_hash text NOT NULL UNIQUE, token_expires_at timestamptz NOT NULL,
 cancellation_reason text, refund_status text NOT NULL DEFAULT 'none' CHECK(refund_status IN ('none','pending','partial','completed')),
 balance_due_at timestamptz NOT NULL, total_cop bigint NOT NULL CHECK(total_cop>=0), deposit_cop bigint NOT NULL CHECK(deposit_cop BETWEEN 0 AND total_cop),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(status <> 'holding' OR hold_expires_at IS NOT NULL)
);
CREATE TABLE public.unit_allocation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inventory_unit_id uuid NOT NULL REFERENCES public.inventory_unit(id), booking_id uuid REFERENCES public.booking(id),
 kind text NOT NULL CHECK(kind IN ('use','backup','maintenance','manual')), period tstzrange NOT NULL, active boolean NOT NULL DEFAULT true,
 expires_at timestamptz, reason text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT isempty(period) AND lower(period) IS NOT NULL AND upper(period) IS NOT NULL AND lower_inc(period) AND NOT upper_inc(period)),
 CHECK((kind IN ('use','backup') AND booking_id IS NOT NULL) OR (kind IN ('maintenance','manual') AND reason IS NOT NULL)),
 EXCLUDE USING gist (inventory_unit_id WITH =, period WITH &&) WHERE (active)
);
CREATE TABLE public.technician_allocation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), technician_id uuid NOT NULL REFERENCES public.technician(id), booking_id uuid REFERENCES public.booking(id),
 kind text NOT NULL CHECK(kind IN ('event','manual')), period tstzrange NOT NULL, active boolean NOT NULL DEFAULT true,
 expires_at timestamptz, reason text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT isempty(period) AND lower(period) IS NOT NULL AND upper(period) IS NOT NULL AND lower_inc(period) AND NOT upper_inc(period)),
 CHECK((kind='event' AND booking_id IS NOT NULL) OR (kind='manual' AND reason IS NOT NULL)),
 EXCLUDE USING gist (technician_id WITH =, period WITH &&) WHERE (active)
);
CREATE TABLE public.payment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES public.booking(id), purpose text NOT NULL CHECK(purpose IN ('deposit','balance')),
 reference text NOT NULL UNIQUE, provider_transaction_id text, status text NOT NULL CHECK(status IN ('pending','approved','declined','error','voided')),
 application_status text NOT NULL CHECK(application_status IN ('unapplied','applied','review','refunded')),
 expected_cop bigint NOT NULL CHECK(expected_cop>0), received_cop bigint CHECK(received_cop>=0), currency text NOT NULL DEFAULT 'COP' CHECK(currency='COP'),
 environment text NOT NULL CHECK(environment IN ('test','prod')), provider_updated_at timestamptz, approved_at timestamptz,
 refunded_cop bigint NOT NULL DEFAULT 0 CHECK(refunded_cop>=0 AND refunded_cop<=coalesce(received_cop,0)),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(environment,provider_transaction_id)
);
CREATE TABLE public.payment_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), environment text NOT NULL CHECK(environment IN ('test','prod')), dedupe_key text NOT NULL,
 provider_transaction_id text NOT NULL, provider_status text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), verified boolean NOT NULL,
 processing_status text NOT NULL, error_code text, payload_private jsonb NOT NULL, UNIQUE(environment,dedupe_key)
);
CREATE TABLE public.operation_record (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES public.booking(id),
 kind text NOT NULL CHECK(kind IN ('prepared','dispatched','returned','incident','closed')), author_user_id uuid NOT NULL REFERENCES public.staff_profile(id),
 occurred_at timestamptz NOT NULL DEFAULT now(), details jsonb NOT NULL, evidence_refs jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE public.audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_type text NOT NULL, actor_id text, entity_type text NOT NULL,
 entity_id uuid NOT NULL, action text NOT NULL, before jsonb, after jsonb, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.command_receipt (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope text NOT NULL, actor_key text NOT NULL, request_key text NOT NULL,
 request_hash text NOT NULL, result_private jsonb NOT NULL, status text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(scope,actor_key,request_key)
);
CREATE TABLE public.analytics_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_name text NOT NULL, business_event_id text NOT NULL, payload jsonb NOT NULL,
 delivery_status text NOT NULL, delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(event_name,business_event_id)
);
CREATE TABLE public.request_limit (
 key text PRIMARY KEY, window_start timestamptz NOT NULL, hits int NOT NULL CHECK(hits>0)
);
-- No Data API access. Server-only SQL connection plus application role checks.
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
 END LOOP;
END $$;
CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='updated_at' LOOP
  EXECUTE format('CREATE TRIGGER touch_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',t);
 END LOOP;
END $$;
CREATE FUNCTION public.deny_history_change() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Append-only history'; END $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.deny_history_change();
CREATE TRIGGER notes_append_only BEFORE UPDATE OR DELETE ON public.lead_note FOR EACH ROW EXECUTE FUNCTION public.deny_history_change();
CREATE TRIGGER operations_append_only BEFORE UPDATE OR DELETE ON public.operation_record FOR EACH ROW EXECUTE FUNCTION public.deny_history_change();
CREATE FUNCTION public.freeze_quote() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF (to_jsonb(NEW)-'status'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'updated_at') THEN RAISE EXCEPTION 'Quote snapshot is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_quote BEFORE UPDATE ON public.quote FOR EACH ROW EXECUTE FUNCTION public.freeze_quote();
CREATE TRIGGER immutable_quote_lines BEFORE UPDATE OR DELETE ON public.quote_line FOR EACH ROW EXECUTE FUNCTION public.deny_history_change();
CREATE FUNCTION public.freeze_used_pricing() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.quote WHERE pricing_version_id=OLD.id) AND
 (to_jsonb(NEW)-'active'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'active'-'updated_at') THEN RAISE EXCEPTION 'Used pricing version is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_used_pricing BEFORE UPDATE ON public.pricing_version FOR EACH ROW EXECUTE FUNCTION public.freeze_used_pricing();
