alter table public.self_service_requests
  drop constraint if exists self_service_requests_status_check;

alter table public.self_service_requests
  add constraint self_service_requests_status_check
  check (status in ('submitted','review','offered','accepted','rejected'));

alter table public.self_service_requests
  add column if not exists rejection jsonb,
  add column if not exists rejected_at timestamptz;

create table if not exists public.offer_rejections (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.self_service_requests(id) on delete restrict,
  rejected_at timestamptz not null,
  reason text not null,
  reason_label text not null,
  details text,
  ip text,
  user_agent text,
  evidence jsonb not null default '{}'::jsonb
);

alter table public.offer_rejections enable row level security;
revoke all on table public.offer_rejections from anon, authenticated;

create or replace function public.capture_self_service_rejection()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if new.status='rejected' and old.status is distinct from 'rejected' then
    insert into public.offer_rejections(request_id,rejected_at,reason,reason_label,details,ip,user_agent,evidence)
    values(new.id,new.rejected_at,new.rejection->>'reason',new.rejection->>'reasonLabel',new.rejection->>'details',new.rejection->>'ip',new.rejection->>'userAgent',new.rejection)
    on conflict(request_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists self_service_rejection_audit on public.self_service_requests;
create trigger self_service_rejection_audit
after update of status on public.self_service_requests
for each row execute function public.capture_self_service_rejection();

