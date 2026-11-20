CREATE TABLE public.calendar_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 180),
 start_at timestamptz NOT NULL,
 end_at timestamptz NOT NULL CHECK(end_at>start_at),
 location text NOT NULL DEFAULT '' CHECK(length(location)<=300),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
 created_by uuid NOT NULL REFERENCES public.staff_profile(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX calendar_event_start_idx ON public.calendar_event(start_at);
ALTER TABLE public.calendar_event ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.calendar_event FROM PUBLIC,anon,authenticated;
