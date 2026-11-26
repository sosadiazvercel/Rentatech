ALTER TABLE public.staff_profile ADD COLUMN display_name text NOT NULL DEFAULT '' CHECK(length(display_name)<=180);
-- An assignable colleague does not need login credentials. Do not reactivate
-- or change permissions on an existing profile.
INSERT INTO public.staff_profile(id,auth_user_id,role,active,display_name)
VALUES('00000000-0000-4000-8000-000000000012',NULL,'operator',true,'Felipe') ON CONFLICT(id) DO NOTHING;
UPDATE public.staff_profile SET display_name=CASE id
 WHEN '00000000-0000-4000-8000-000000000011' THEN 'Jorge'
 WHEN '00000000-0000-4000-8000-000000000012' THEN 'Felipe'
 ELSE display_name END;

-- Only repair the old lead-confirmation path, whose transition required a
-- verified payment reference. Never infer payment from booking status alone.
WITH repaired AS (
 INSERT INTO public.payment(booking_id,purpose,reference,status,application_status,expected_cop,received_cop,environment,approved_at,method)
 SELECT b.id,'balance',l.payment_reference,'approved','applied',b.total_cop,b.total_cop,'prod',b.confirmed_at,'manual'
 FROM public.booking b JOIN public.quote q ON q.id=b.quote_id JOIN public.lead l ON l.id=q.lead_id
 WHERE b.request_key='lead-confirm:'||l.id::text AND b.status IN ('confirmed','in_service','completed')
 AND b.paid_cop=0 AND b.total_cop>0 AND length(trim(l.payment_reference))>0
 AND NOT EXISTS(SELECT 1 FROM public.payment p WHERE p.booking_id=b.id OR p.reference=l.payment_reference)
 AND EXISTS(SELECT 1 FROM public.audit_log a WHERE a.entity_type='lead' AND a.entity_id=l.id
  AND a.after->>'stage'='confirmed' AND a.before->>'stage'='awaiting_payment'
  AND a.after->>'paymentReference'=l.payment_reference)
 ON CONFLICT(reference) DO NOTHING RETURNING booking_id,received_cop
), updated AS (
 UPDATE public.booking b SET paid_cop=r.received_cop,payment_status='PAID'
 FROM repaired r WHERE b.id=r.booking_id RETURNING b.id
)
INSERT INTO public.audit_log(actor_type,entity_type,entity_id,action)
SELECT 'migration','booking',id,'verified_lead_payment_repaired' FROM updated;
