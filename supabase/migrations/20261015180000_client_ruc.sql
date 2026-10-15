-- RUC opcional del cliente, para facturar en caja sin perder la boleta a persona natural.

alter table public.clients
  add column if not exists ruc text,
  add column if not exists business_name text;

create unique index if not exists clients_clinic_ruc_idx
  on public.clients (clinic_id, ruc)
  where ruc is not null;
