-- Vincula veterinarios a usuarios auth y permite alta de equipo por admin.

alter table public.veterinarians
  add column if not exists user_id uuid unique references auth.users (id) on delete set null;

create index if not exists veterinarians_user_id_idx
  on public.veterinarians (user_id)
  where user_id is not null;

-- El alta de staff pasa clinic_id y role en raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_clinic uuid;
  meta_role text;
begin
  meta_clinic := nullif(new.raw_user_meta_data ->> 'clinic_id', '')::uuid;
  meta_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'administrador');
  if meta_role not in ('recepcion', 'veterinario', 'caja', 'administrador') then
    meta_role := 'administrador';
  end if;

  insert into public.profiles (id, clinic_id, role, full_name, email)
  values (
    new.id,
    coalesce(meta_clinic, '7624c6ed-4bbb-45aa-b4cb-e87ecd6c1b7d'),
    meta_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

-- Evita recursión RLS al comprobar rol de admin.
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Admin de la misma clínica puede listar perfiles del equipo.
drop policy if exists profiles_select_clinic_admin on public.profiles;
create policy profiles_select_clinic_admin on public.profiles
  for select to authenticated
  using (
    clinic_id = public.current_clinic_id()
    and public.current_profile_role() = 'administrador'
  );
