-- Duración, precio, canal, aviso y enlace público de la cita.
-- Pégalo en el editor SQL de Supabase si esta migración aún no corrió.

alter table public.appointments
  add column if not exists duration_minutes integer not null default 30,
  add column if not exists estimated_price numeric not null default 0,
  add column if not exists channel text not null default 'presencial',
  add column if not exists remind_client boolean not null default false,
  add column if not exists public_token text,
  add column if not exists client_reply text,
  add column if not exists client_reply_at timestamptz;

alter table public.appointments
  drop constraint if exists appointments_channel_check;
alter table public.appointments
  add constraint appointments_channel_check
  check (channel in ('presencial', 'telefono', 'whatsapp'));

alter table public.appointments
  drop constraint if exists appointments_client_reply_check;
alter table public.appointments
  add constraint appointments_client_reply_check
  check (client_reply is null or client_reply in ('confirmada', 'no_puede'));

create unique index if not exists appointments_public_token_idx
  on public.appointments (public_token)
  where public_token is not null;

alter table public.patients
  alter column birth_date drop not null;

insert into public.catalog_services (id, clinic_id, name, category, price, duration_minutes)
select gen_random_uuid(), c.id, 'Cirugía', 'cirugia', 250, 90
from public.clinics c
where not exists (
  select 1
  from public.catalog_services s
  where s.clinic_id = c.id and s.category = 'cirugia'
);

create or replace function public.lookup_public_appointment(token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if token is null or length(token) < 20 then
    return null;
  end if;

  select jsonb_build_object(
    'status', a.status,
    'clientReply', a.client_reply,
    'date', a.date,
    'time', left(a.time, 5),
    'durationMinutes', a.duration_minutes,
    'reason', a.reason,
    'serviceType', a.service_type,
    'estimatedPrice', a.estimated_price,
    'petName', p.name,
    'species', p.species,
    'breed', p.breed,
    'vetName', v.name,
    'vetSpecialty', v.specialty,
    'clinicName', c.name,
    'clinicAddress', c.address,
    'clinicPhone', c.phone,
    'clientFirstName', split_part(cl.name, ' ', 1)
  )
  into result
  from public.appointments a
  join public.patients p on p.id = a.patient_id
  join public.veterinarians v on v.id = a.veterinarian_id
  join public.clinics c on c.id = a.clinic_id
  join public.clients cl on cl.id = a.client_id
  where a.public_token = token;

  return result;
end;
$$;

create or replace function public.reply_public_appointment(token text, reply text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  appt public.appointments%rowtype;
  today date := (timezone('America/Lima', now()))::date;
  pet_name text;
begin
  if reply is null or reply not in ('confirmada', 'no_puede') then
    return jsonb_build_object('error', 'Respuesta no válida');
  end if;

  select * into appt
  from public.appointments
  where public_token = token;

  if not found then
    return jsonb_build_object('error', 'Cita no encontrada');
  end if;

  if appt.date < today
    or appt.status in ('atendida', 'pagada', 'cancelada', 'no_asistio', 'en_consulta', 'llego') then
    return jsonb_build_object('error', 'Esta cita ya no admite cambios');
  end if;

  select name into pet_name from public.patients where id = appt.patient_id;

  if reply = 'confirmada' then
    update public.appointments
    set status = 'confirmada',
        status_before = case when status = 'confirmada' then status_before else status end,
        client_reply = 'confirmada',
        client_reply_at = now()
    where id = appt.id;
  else
    update public.appointments
    set status = 'programada',
        client_reply = 'no_puede',
        client_reply_at = now()
    where id = appt.id;

    insert into public.activity_events (clinic_id, message, occurred_at, type)
    values (
      appt.clinic_id,
      'El cliente no puede asistir: ' || coalesce(pet_name, 'mascota')
        || ' · ' || to_char(appt.date, 'DD/MM') || ' ' || left(appt.time, 5),
      now(),
      'appointment'
    );

    insert into public.follow_ups (
      clinic_id, patient_id, client_id, type, title, due_date, status, related_id, notes
    )
    select
      appt.clinic_id,
      appt.patient_id,
      appt.client_id,
      'no_show',
      'El cliente no puede asistir: ' || coalesce(pet_name, 'mascota'),
      appt.date,
      'pendiente',
      appt.id,
      'Avisó desde su enlace. La hora no se movió.'
    where not exists (
      select 1
      from public.follow_ups f
      where f.related_id = appt.id
        and f.status = 'pendiente'
        and f.type = 'no_show'
    );
  end if;

  return public.lookup_public_appointment(token);
end;
$$;

revoke all on function public.lookup_public_appointment(text) from public;
revoke all on function public.reply_public_appointment(text, text) from public;
grant execute on function public.lookup_public_appointment(text) to anon, authenticated;
grant execute on function public.reply_public_appointment(text, text) to anon, authenticated;
