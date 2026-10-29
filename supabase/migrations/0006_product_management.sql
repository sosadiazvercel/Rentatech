ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_code_check;
ALTER TABLE public.equipment ADD CONSTRAINT equipment_code_check CHECK(code ~ '^[A-Z0-9][A-Z0-9_-]{0,39}$');
ALTER TABLE public.equipment
 ADD COLUMN slug text,
 ADD COLUMN brand text NOT NULL DEFAULT '',
 ADD COLUMN description text NOT NULL DEFAULT '',
 ADD COLUMN summary text NOT NULL DEFAULT '',
 ADD COLUMN categories text[] NOT NULL DEFAULT ARRAY['Realidad virtual'],
 ADD COLUMN specifications jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(specifications)='array' AND jsonb_array_length(specifications)<=40),
 ADD COLUMN published boolean NOT NULL DEFAULT true,
 ADD COLUMN featured boolean NOT NULL DEFAULT true,
 ADD COLUMN sort_order integer NOT NULL DEFAULT 0,
 ADD CONSTRAINT equipment_categories_check CHECK(cardinality(categories) BETWEEN 1 AND 12);

UPDATE public.equipment SET slug=CASE code WHEN 'QUEST2' THEN 'meta-quest-2' WHEN 'QUEST3' THEN 'meta-quest-3' ELSE lower(code) END;
ALTER TABLE public.equipment ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.equipment ADD CONSTRAINT equipment_slug_key UNIQUE(slug);
ALTER TABLE public.equipment ADD CONSTRAINT equipment_slug_check CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug)<=120);

UPDATE public.equipment SET brand='Meta',
 description='Realidad virtual inalámbrica y versátil para tus eventos.',
 summary='128 GB / 2 controles Touch / seguimiento 6DOF',
 specifications='[["Tipo","Standalone VR"],["Almacenamiento","128 GB"],["Resolución","1832 x 1920 por ojo"],["Mandos","Touch incluidos"],["Seguimiento","Inside-out"],["Passthrough","Blanco y negro"]]',
 sort_order=10 WHERE code='QUEST2';
UPDATE public.equipment SET brand='Meta',
 description='Nuestro equipo principal para experiencias inmersivas y contenido con mayor nitidez.',
 summary='512 GB / 2 controles Touch Plus / seguimiento 6DOF',
 categories=ARRAY['Realidad virtual','Realidad mixta'],
 specifications='[["Tipo","Standalone VR"],["Almacenamiento","512 GB"],["Resolución","2064 x 2208 por ojo"],["Mandos","Touch Plus incluidos"],["Seguimiento","Inside-out"],["Passthrough","A color"]]',
 sort_order=20 WHERE code='QUEST3';

-- The existing equipment table already has RLS and no direct client write access.
-- Product content is exposed only through explicit public SELECTs; mutations require staff.
