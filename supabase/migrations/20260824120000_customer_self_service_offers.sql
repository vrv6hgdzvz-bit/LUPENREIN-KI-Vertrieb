-- Public self-service request data and private pricing remain in one owner-controlled table.
-- No anon/authenticated grants or policies are created: public access is only via validated server routes.
create table if not exists public.self_service_requests (
  id uuid primary key,
  owner_id uuid references auth.users(id) on delete set null,
  public_token text not null unique,
  offer_token text not null unique,
  status text not null check (status in ('submitted','review','offered','accepted')),
  responses jsonb not null,
  generated_lv_items jsonb not null default '[]'::jsonb,
  offer_items jsonb not null default '[]'::jsonb,
  pricing_result jsonb not null,
  offer_number text not null unique,
  valid_until date not null,
  acceptance jsonb,
  internal_activity jsonb,
  follow_up_task jsonb,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists self_service_requests_status_idx on public.self_service_requests(status,created_at desc);
create index if not exists self_service_requests_owner_idx on public.self_service_requests(owner_id,created_at desc) where owner_id is not null;
alter table public.self_service_requests enable row level security;
revoke all on table public.self_service_requests from anon, authenticated;

-- Extensible catalog. Only signed-in owners can manage their catalog.
create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  code text not null, name text not null, description text, icon text, active boolean not null default true,
  default_lv_items jsonb not null default '[]'::jsonb, pricing_defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,code)
);
alter table public.service_catalog enable row level security;
create policy "service_catalog_select_own" on public.service_catalog for select to authenticated using ((select auth.uid())=owner_id);
create policy "service_catalog_insert_own" on public.service_catalog for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "service_catalog_update_own" on public.service_catalog for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy "service_catalog_delete_own" on public.service_catalog for delete to authenticated using ((select auth.uid())=owner_id);

-- Separate audit record makes an acceptance append-only and independently queryable.
create table if not exists public.offer_acceptances (
  id uuid primary key default gen_random_uuid(), request_id uuid not null unique references public.self_service_requests(id) on delete restrict,
  accepted_at timestamptz not null, ip text, user_agent text, evidence jsonb not null default '{}'::jsonb
);
alter table public.offer_acceptances enable row level security;
revoke all on table public.offer_acceptances from anon, authenticated;

create or replace function public.capture_self_service_acceptance() returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.status='accepted' and old.status is distinct from 'accepted' then
    insert into public.offer_acceptances(request_id,accepted_at,ip,user_agent,evidence)
    values(new.id,new.accepted_at,new.acceptance->>'ip',new.acceptance->>'userAgent',new.acceptance) on conflict(request_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists self_service_acceptance_audit on public.self_service_requests;
create trigger self_service_acceptance_audit after update of status on public.self_service_requests for each row execute function public.capture_self_service_acceptance();

