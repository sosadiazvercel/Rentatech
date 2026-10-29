-- SQL CHECK accepts NULL, so require values explicitly for these invariants.
ALTER TABLE public.lead ADD CONSTRAINT lost_requires_reason
 CHECK(stage <> 'lost' OR (loss_reason IS NOT NULL AND length(trim(loss_reason))>0));
ALTER TABLE public.inventory_unit ADD CONSTRAINT ready_requires_real_serial
 CHECK(status <> 'ready' OR is_fixture OR (serial IS NOT NULL AND length(trim(serial))>0));
