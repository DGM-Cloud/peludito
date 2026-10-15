-- Peludito: esquema inicial, sedes y aislamiento por clínica.

create extension if not exists pgcrypto;

create table public.clinics (
  id uuid primary key,
  name text not null,
  address text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id),
  role text not null default 'recepcion'
    check (role in ('recepcion', 'veterinario', 'caja', 'administrador')),
  full_name text not null,
  email text not null default '',
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  name text not null,
  phone text not null default '',
  email text not null default '',
  document_type text check (document_type in ('DNI', 'CE')),
  document_number text,
  address text,
  last_visit date,
  created_at timestamptz not null default now()
);

create unique index clients_clinic_document_idx
  on public.clients (clinic_id, document_number)
  where document_number is not null;
create index clients_clinic_name_idx on public.clients (clinic_id, name);

create table public.veterinarians (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  name text not null,
  specialty text not null default '',
  email text not null default '',
  phone text not null default '',
  initials text not null default ''
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  client_id uuid not null references public.clients (id),
  name text not null,
  species text not null check (species in ('perro', 'gato', 'ave', 'conejo')),
  breed text not null default '',
  sex text not null check (sex in ('macho', 'hembra')),
  birth_date date not null,
  weight numeric not null default 0,
  microchip text,
  allergies text[] not null default '{}',
  status text not null default 'activo' check (status in ('activo', 'inactivo')),
  last_visit date,
  photo_url text
);
create index patients_client_idx on public.patients (client_id);
create index patients_clinic_name_idx on public.patients (clinic_id, name);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  client_id uuid not null references public.clients (id),
  veterinarian_id uuid not null references public.veterinarians (id),
  date date not null,
  time text not null,
  reason text not null,
  service_type text not null,
  notes text,
  status text not null default 'programada',
  status_before text,
  medical_record_id uuid,
  sale_id uuid
);
create index appointments_clinic_date_idx
  on public.appointments (clinic_id, date, veterinarian_id);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  veterinarian_id uuid not null references public.veterinarians (id),
  date date not null,
  reason text not null,
  symptoms text not null default '',
  diagnosis text not null default '',
  treatment text not null default '',
  medications text[] not null default '{}',
  observations text,
  status text not null default 'abierta'
    check (status in ('abierta', 'cerrada', 'seguimiento'))
);

create table public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  veterinarian_id uuid not null references public.veterinarians (id),
  name text not null,
  laboratory text not null default '',
  lot text not null default '',
  date_applied date not null,
  next_due date not null,
  notes text
);
create index vaccinations_patient_idx on public.vaccinations (patient_id);

create table public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  name text not null,
  dosage text not null default '',
  frequency text not null default '',
  start_date date not null,
  end_date date,
  active boolean not null default true
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  client_id uuid not null references public.clients (id),
  type text not null,
  title text not null,
  due_date date not null,
  status text not null default 'pendiente',
  related_id uuid,
  notes text
);
create index follow_ups_due_idx on public.follow_ups (clinic_id, due_date);

create table public.hospitalizations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  veterinarian_id uuid not null references public.veterinarians (id),
  cage text not null,
  reason text not null,
  admission_date date not null,
  discharge_date date,
  status text not null,
  treatment text not null default '',
  observations text
);

create table public.hospitalization_notes (
  id uuid primary key default gen_random_uuid(),
  hospitalization_id uuid not null references public.hospitalizations (id) on delete cascade,
  date date not null,
  time text not null,
  note text not null,
  veterinarian_id uuid not null references public.veterinarians (id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  name text not null,
  category text not null,
  stock integer not null default 0,
  min_stock integer not null default 0,
  price numeric not null default 0,
  unit text not null default 'unidad',
  presentation text,
  provider text
);

create table public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  product_id uuid not null references public.products (id),
  lot text not null,
  expiry_date date not null,
  quantity integer not null default 0,
  provider text not null default '',
  received_at date not null
);
create index batches_expiry_idx on public.inventory_batches (clinic_id, expiry_date);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  product_id uuid not null references public.products (id),
  type text not null check (type in ('entrada', 'salida', 'ajuste')),
  quantity integer not null,
  reason text not null,
  date date not null,
  sale_id uuid
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  client_id uuid not null references public.clients (id),
  patient_id uuid references public.patients (id),
  date date not null,
  time text not null,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null,
  voucher_type text not null,
  voucher_number text,
  document_number text,
  business_name text,
  notes text,
  appointment_id uuid
);
create index sales_clinic_date_idx on public.sales (clinic_id, date);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  type text not null check (type in ('servicio', 'producto')),
  reference_id text not null,
  name text not null,
  quantity integer not null,
  unit_price numeric not null,
  total numeric not null
);

create table public.grooming_appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  client_id uuid not null references public.clients (id),
  service text not null,
  date date not null,
  time text not null,
  professional text not null,
  status text not null default 'programada',
  appointment_id uuid,
  sale_id uuid,
  notes text
);

create table public.catalog_services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  name text not null,
  category text not null,
  price numeric not null,
  duration_minutes integer not null default 30
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  message text not null,
  occurred_at timestamptz not null,
  type text not null
);

alter table public.appointments
  add constraint appointments_medical_record_fk
  foreign key (medical_record_id) references public.medical_records (id);
alter table public.appointments
  add constraint appointments_sale_fk
  foreign key (sale_id) references public.sales (id);

insert into public.clinics (id, name, address, phone) values
  (
    '7624c6ed-4bbb-45aa-b4cb-e87ecd6c1b7d',
    'Clínica San Miguel',
    'Av. La Marina 1250, San Miguel',
    '014561234'
  ),
  (
    '1e31de9b-db97-407c-93be-dca6d033693a',
    'Clínica Miraflores',
    'Av. Benavides 480, Miraflores',
    '014567890'
  );

create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, clinic_id, role, full_name, email)
  values (
    new.id,
    '7624c6ed-4bbb-45aa-b4cb-e87ecd6c1b7d',
    'administrador',
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;

create policy clinics_select on public.clinics
  for select to authenticated
  using (id = public.current_clinic_id());

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

do $$
declare
  tenant_table text;
begin
  foreach tenant_table in array array[
    'clients',
    'veterinarians',
    'patients',
    'appointments',
    'medical_records',
    'vaccinations',
    'patient_medications',
    'follow_ups',
    'hospitalizations',
    'products',
    'inventory_batches',
    'inventory_movements',
    'sales',
    'grooming_appointments',
    'catalog_services',
    'activity_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', tenant_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (clinic_id = public.current_clinic_id()) with check (clinic_id = public.current_clinic_id())',
      tenant_table || '_clinic',
      tenant_table
    );
  end loop;
end $$;

alter table public.hospitalization_notes enable row level security;
create policy hospitalization_notes_clinic on public.hospitalization_notes
  for all to authenticated
  using (
    exists (
      select 1 from public.hospitalizations h
      where h.id = hospitalization_id
        and h.clinic_id = public.current_clinic_id()
    )
  )
  with check (
    exists (
      select 1 from public.hospitalizations h
      where h.id = hospitalization_id
        and h.clinic_id = public.current_clinic_id()
    )
  );

alter table public.sale_items enable row level security;
create policy sale_items_clinic on public.sale_items
  for all to authenticated
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and s.clinic_id = public.current_clinic_id()
    )
  )
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and s.clinic_id = public.current_clinic_id()
    )
  );

grant usage on schema public to authenticated;
grant select on public.clinics to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.clients,
  public.veterinarians,
  public.patients,
  public.appointments,
  public.medical_records,
  public.vaccinations,
  public.patient_medications,
  public.follow_ups,
  public.hospitalizations,
  public.hospitalization_notes,
  public.products,
  public.inventory_batches,
  public.inventory_movements,
  public.sales,
  public.sale_items,
  public.grooming_appointments,
  public.catalog_services,
  public.activity_events
to authenticated;
