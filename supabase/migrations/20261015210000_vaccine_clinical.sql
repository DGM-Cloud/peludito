-- Catálogo clínico de vacunas y campos de dosis (sin inventario).

create table if not exists public.vaccine_catalog (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  species text[] not null default '{}',
  default_interval_days integer not null default 365
    check (default_interval_days >= 1 and default_interval_days <= 3650),
  laboratory_hint text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists vaccine_catalog_clinic_idx
  on public.vaccine_catalog (clinic_id, active, name);

alter table public.vaccinations
  add column if not exists catalog_id uuid references public.vaccine_catalog (id) on delete set null,
  add column if not exists lot_expiry date,
  add column if not exists route text not null default 'subcutanea'
    check (route in ('subcutanea', 'intramuscular', 'oral', 'nasal', 'otra')),
  add column if not exists site text,
  add column if not exists dose_ml numeric,
  add column if not exists series_status text not null default 'activa'
    check (series_status in ('activa', 'completada')),
  add column if not exists medical_record_id uuid references public.medical_records (id) on delete set null;

create index if not exists vaccinations_catalog_idx on public.vaccinations (catalog_id);
create index if not exists vaccinations_record_idx on public.vaccinations (medical_record_id);

alter table public.vaccine_catalog enable row level security;

drop policy if exists vaccine_catalog_clinic on public.vaccine_catalog;
create policy vaccine_catalog_clinic on public.vaccine_catalog
  for all to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

grant select, insert, update, delete on public.vaccine_catalog to authenticated;

-- Semilla de catálogo por clínica existente.
insert into public.vaccine_catalog (clinic_id, name, species, default_interval_days, laboratory_hint)
select
  c.id,
  v.name,
  v.species,
  v.interval_days,
  v.lab
from public.clinics c
cross join (
  values
    ('Antirrábica', array['perro', 'gato']::text[], 365, 'BioVet Perú'),
    ('Óctuple (DHPPIL)', array['perro']::text[], 365, 'BioVet Perú'),
    ('Quíntuple (DHPP)', array['perro']::text[], 365, 'BioVet Perú'),
    ('Bordetella', array['perro']::text[], 365, 'BioVet Perú'),
    ('Triple felina', array['gato']::text[], 365, 'FeliVax'),
    ('Leucemia felina', array['gato']::text[], 365, 'FeliVax'),
    ('Desparasitación interna', array['perro', 'gato']::text[], 90, '')
) as v(name, species, interval_days, lab)
where not exists (
  select 1 from public.vaccine_catalog existing
  where existing.clinic_id = c.id and existing.name = v.name
);
