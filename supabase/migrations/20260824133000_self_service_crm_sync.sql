alter table public.self_service_requests
  add column if not exists crm_sync jsonb;

