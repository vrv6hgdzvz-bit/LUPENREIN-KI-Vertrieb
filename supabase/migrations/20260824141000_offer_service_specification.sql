alter table public.offers
  add column if not exists service_specification jsonb not null
  default '{"version":1,"items":[]}'::jsonb;
