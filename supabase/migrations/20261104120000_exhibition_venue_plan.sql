-- The venue / hall map that staff attach when they create an exhibition
-- (photo, sketch or PDF). It lives in the private hall-plans bucket under
-- <exhibition id>/venue/. The halls read from it are ordinary rows in halls.
alter table public.exhibitions
  add column venue_plan_path text;

comment on column public.exhibitions.venue_plan_path is
  'Storage path (bucket hall-plans) of the uploaded venue or hall map, if any.';
