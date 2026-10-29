-- Sprint 2: explicit user brief supersedes provisional S0 ratios and pricing gates.
-- Preserve Sprint 1 leads, fixtures and immutable history.
ALTER TABLE equipment DROP CONSTRAINT equipment_code_check;
ALTER TABLE equipment DROP CONSTRAINT equipment_category_check;
ALTER TABLE inventory_unit DROP CONSTRAINT ready_requires_real_serial;
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='inventory_unit'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%inspected_at%' LOOP
 EXECUTE format('ALTER TABLE inventory_unit DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
ALTER TABLE inventory_unit ADD CONSTRAINT serial_not_blank CHECK(serial IS NULL OR length(trim(serial))>0);
ALTER TABLE inventory_unit ADD COLUMN condition text NOT NULL DEFAULT 'Pendiente de inspección';
ALTER TABLE inventory_unit ADD COLUMN notes text NOT NULL DEFAULT '';
ALTER TABLE technician ADD COLUMN email text NOT NULL DEFAULT '';
ALTER TABLE technician ADD COLUMN internal_cost_4h bigint CHECK(internal_cost_4h>=0);
ALTER TABLE technician ADD COLUMN internal_cost_8h bigint CHECK(internal_cost_8h>=0);
ALTER TABLE technician ADD COLUMN notes text NOT NULL DEFAULT '';
ALTER TABLE technician_allocation ADD COLUMN internal_cost_cop bigint CHECK(internal_cost_cop>=0);
ALTER TABLE technician_allocation ADD COLUMN client_price_cop bigint CHECK(client_price_cop>=0);
ALTER TABLE quote DROP CONSTRAINT quote_status_check;
ALTER TABLE quote ADD CONSTRAINT quote_status_check CHECK(status IN ('draft','quote_sent','pending_confirmation','issued','accepted','expired','superseded','cancelled'));
ALTER TABLE quote DROP CONSTRAINT quote_backup_count_check;
ALTER TABLE quote ADD CONSTRAINT quote_backup_count_check CHECK(backup_count>=0);
CREATE SEQUENCE quote_number_seq;
CREATE SEQUENCE reservation_number_seq;
CREATE SEQUENCE incident_number_seq;
ALTER TABLE quote ADD COLUMN number text NOT NULL DEFAULT ('RT-Q-'||lpad(nextval('quote_number_seq')::text,6,'0')) UNIQUE;
ALTER TABLE booking ADD COLUMN number text NOT NULL DEFAULT ('RT-R-'||lpad(nextval('reservation_number_seq')::text,6,'0')) UNIQUE;
ALTER TABLE booking ADD COLUMN paid_cop bigint NOT NULL DEFAULT 0 CHECK(paid_cop>=0 AND paid_cop<=total_cop);
ALTER TABLE booking ADD COLUMN payment_status text NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID','PARTIALLY_PAID','PAID','REFUNDED'));
ALTER TABLE booking ADD COLUMN deposit_percentage numeric NOT NULL DEFAULT 50 CHECK(deposit_percentage BETWEEN 0 AND 100);
ALTER TABLE booking ADD COLUMN balance_due_cop bigint GENERATED ALWAYS AS (total_cop-paid_cop) STORED;
ALTER TABLE payment ADD COLUMN method text NOT NULL DEFAULT 'gateway' CHECK(method IN ('gateway','manual'));
ALTER TABLE payment ADD COLUMN recorded_by uuid REFERENCES staff_profile(id);
CREATE TABLE transport_zone(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text UNIQUE NOT NULL,base_price bigint CHECK(base_price>=0),active boolean NOT NULL DEFAULT true);
INSERT INTO transport_zone(name,base_price) VALUES('Bogotá',NULL);
CREATE TABLE rental_settings(id boolean PRIMARY KEY DEFAULT true CHECK(id),pricing_version_id uuid NOT NULL REFERENCES pricing_version(id));
INSERT INTO pricing_version(version,mode,rules,rules_hash,active) VALUES('sprint2-initial','sandbox',
'{"minimumQuantity":3,"tiers":[{"product":"QUEST2","min":3,"max":9,"unit":160000},{"product":"QUEST2","min":10,"max":14,"unit":145000},{"product":"QUEST3","min":3,"max":9,"unit":220000},{"product":"QUEST3","min":10,"max":14,"unit":200000},{"product":"QUEST3","min":15,"max":15,"unit":190000}],"staffRules":[{"min":3,"max":10,"count":1},{"min":11,"max":15,"count":2}],"technicianRates":{"4":400000,"5":480000,"6":560000,"7":640000,"8":700000},"durationFactors":{"4":1,"5":1,"6":1,"7":1,"8":1},"extraHourRate":null,"bufferBeforeMinutes":null,"bufferAfterMinutes":null,"taxPercent":null,"depositPercent":50,"cancellationPolicy":"Pendiente de aprobación: reprogramación >7 días; penalidades 3–7 días, <72 h y no-show por definir.","damagePolicy":"Pendiente de definir"}', 'initial-user-brief',true);
INSERT INTO rental_settings(pricing_version_id) SELECT id FROM pricing_version WHERE version='sprint2-initial';
INSERT INTO equipment(code,name) VALUES('QUEST2','Meta Quest 2'),('QUEST3','Meta Quest 3') ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO inventory_unit(equipment_id,asset_tag,status,is_fixture,notes)
SELECT e.id,CASE e.code WHEN 'QUEST2' THEN 'Q2-' ELSE 'Q3-' END||lpad(n::text,3,'0'),'ready',false,'Inventario declarado por el propietario en Sprint 2; serial pendiente.'
FROM equipment e CROSS JOIN LATERAL generate_series(1,CASE e.code WHEN 'QUEST2' THEN 14 ELSE 15 END) n WHERE e.code IN ('QUEST2','QUEST3') ON CONFLICT(asset_tag) DO NOTHING;
CREATE TABLE incident(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),number text UNIQUE NOT NULL DEFAULT ('RT-I-'||lpad(nextval('incident_number_seq')::text,6,'0')),booking_id uuid NOT NULL REFERENCES booking(id),asset_id uuid NOT NULL REFERENCES inventory_unit(id),type text NOT NULL CHECK(type IN ('DAMAGE','LOSS','THEFT','ACCESSORY_LOSS','OTHER')),description text NOT NULL,estimated_cost bigint CHECK(estimated_cost>=0),final_cost bigint CHECK(final_cost>=0),photos jsonb NOT NULL DEFAULT '[]',status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE vr_experience(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,description text NOT NULL,quest_2_compatible boolean NOT NULL DEFAULT false,quest_3_compatible boolean NOT NULL DEFAULT false,commercial_use_status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(commercial_use_status IN ('VERIFIED','PENDING_REVIEW','NOT_ALLOWED')),license_cost bigint CHECK(license_cost>=0),licenses_available int CHECK(licenses_available>=0),active boolean NOT NULL DEFAULT false);
CREATE TABLE internal_notification(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),quote_id uuid NOT NULL REFERENCES quote(id),message text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notification_outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),quote_id uuid NOT NULL REFERENCES quote(id),channel text NOT NULL CHECK(channel IN ('email','whatsapp')),status text NOT NULL DEFAULT 'not_configured',created_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['transport_zone','rental_settings','incident','vr_experience','internal_notification','notification_outbox'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON %I FROM PUBLIC,anon,authenticated',t); END LOOP;
END $$;
