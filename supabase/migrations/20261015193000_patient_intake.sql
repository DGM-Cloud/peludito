-- Alta de paciente: identificación, reproducción, alertas y peso como medición.

alter table public.patients drop constraint if exists patients_species_check;
alter table public.patients
  add constraint patients_species_check
  check (species in (
    'perro', 'gato', 'ave', 'conejo', 'hamster', 'cobayo', 'tortuga', 'reptil', 'otro'
  ));

alter table public.patients alter column birth_date drop not null;

alter table public.patients
  add column if not exists code text,
  add column if not exists alt_name text,
  add column if not exists coat text,
  add column if not exists birth_is_estimated boolean not null default false,
  add column if not exists age_years integer,
  add column if not exists age_months integer,
  add column if not exists microchip_implanted_on date,
  add column if not exists microchip_place text,
  add column if not exists reproductive_status text not null default 'desconocido'
    check (reproductive_status in ('entero', 'esterilizado', 'desconocido')),
  add column if not exists sterilized_on date,
  add column if not exists sterilization_procedure text,
  add column if not exists confirmed_allergies jsonb not null default '[]'::jsonb,
  add column if not exists adverse_reactions jsonb not null default '[]'::jsonb,
  add column if not exists chronic_conditions jsonb not null default '[]'::jsonb,
  add column if not exists handling_alerts jsonb not null default '[]'::jsonb,
  add column if not exists safety_notes text,
  add column if not exists info_source text
    check (info_source is null or info_source in ('tutor', 'documento', 'evaluacion')),
  add column if not exists weight_history jsonb not null default '[]'::jsonb,
  add column if not exists vital_status text not null default 'vivo'
    check (vital_status in ('vivo', 'fallecido')),
  add column if not exists deceased_on date,
  add column if not exists created_by uuid,
  add column if not exists created_by_name text,
  add column if not exists updated_by uuid,
  add column if not exists updated_by_name text,
  add column if not exists updated_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

update public.patients
set code = 'PL-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where code is null;

create unique index if not exists patients_clinic_code_idx
  on public.patients (clinic_id, code);

create unique index if not exists patients_clinic_microchip_idx
  on public.patients (clinic_id, microchip)
  where microchip is not null and microchip <> '';
