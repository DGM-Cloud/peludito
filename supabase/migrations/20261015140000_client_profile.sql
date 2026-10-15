-- Ficha de cliente: contacto, domicilio, autorizaciones y trazabilidad.

alter table public.clients drop constraint if exists clients_document_type_check;
alter table public.clients
  add constraint clients_document_type_check
  check (document_type is null or document_type in ('DNI', 'CE', 'PASAPORTE', 'OTRO'));

alter table public.clients
  add column if not exists birth_date date,
  add column if not exists phone_alt text,
  add column if not exists preferred_channel text not null default 'whatsapp'
    check (preferred_channel in ('llamada', 'whatsapp', 'correo')),
  add column if not exists allow_call boolean not null default false,
  add column if not exists allow_whatsapp boolean not null default false,
  add column if not exists allow_email boolean not null default false,
  add column if not exists district text,
  add column if not exists province text,
  add column if not exists department text,
  add column if not exists address_reference text,
  add column if not exists relationship text not null default 'propietario'
    check (relationship in ('propietario', 'tutor', 'responsable')),
  add column if not exists status text not null default 'activo'
    check (status in ('activo', 'inactivo')),
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists notes text,
  add column if not exists authorized_contacts jsonb not null default '[]'::jsonb,
  add column if not exists created_by uuid,
  add column if not exists created_by_name text,
  add column if not exists updated_by uuid,
  add column if not exists updated_by_name text,
  add column if not exists updated_at timestamptz;

alter table public.patients alter column birth_date drop not null;
