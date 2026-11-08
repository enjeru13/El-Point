-- "Reclama tu local": el dueño real de un local sin dueño (los importados de
-- OpenStreetMap) lo pide desde la app con una foto de prueba, y un admin lo
-- aprueba o lo rechaza desde el panel.
--
-- Al aprobar, el local pasa a ser suyo y recibe lo mismo que un local nuevo
-- aprobado: número de Original si quedan cupos (si no, 3 meses de prueba desde
-- hoy) y 14 días de Destacado. Su cuenta pasa a ser de dueño.
--
-- La foto va al bucket privado restaurant-verification, en
-- "<uid>/claims/<archivo>": las políticas que ya existen dejan que solo esa
-- persona y los admins la lean.

create table if not exists public.restaurant_claims (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  whatsapp text not null check (char_length(whatsapp) between 7 and 20),
  rif text check (rif is null or char_length(rif) between 5 and 20),
  photo_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null
);

-- Una solicitud en revisión por persona a la vez.
create unique index if not exists restaurant_claims_one_pending_per_user
  on public.restaurant_claims (user_id) where status = 'pending';
create index if not exists restaurant_claims_status_idx
  on public.restaurant_claims (status, created_at desc);
create index if not exists restaurant_claims_restaurant_idx
  on public.restaurant_claims (restaurant_id);

alter table public.restaurant_claims enable row level security;
revoke all on public.restaurant_claims from anon, authenticated;
grant select on public.restaurant_claims to authenticated;

drop policy if exists "claims readable by claimant or admin" on public.restaurant_claims;
create policy "claims readable by claimant or admin"
  on public.restaurant_claims for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));

-- ─── Enviar una solicitud ───────────────────────────────────────────────────
create or replace function public.submit_restaurant_claim(
  p_restaurant_id uuid,
  p_full_name text,
  p_whatsapp text,
  p_rif text,
  p_photo_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_full_name, ''));
  v_wa text := btrim(coalesce(p_whatsapp, ''));
  v_rif text := nullif(upper(btrim(coalesce(p_rif, ''))), '');
  v_rest record;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select id, name, owner_id, status into v_rest
  from public.restaurants where id = p_restaurant_id;
  if v_rest.id is null or v_rest.status <> 'approved' then
    raise exception 'Local no encontrado';
  end if;
  if v_rest.owner_id is not null then
    raise exception 'Este local ya tiene dueño';
  end if;

  if exists (select 1 from public.restaurants where owner_id = v_user) then
    raise exception 'Ya tienes un local en El Point. Escríbenos por Soporte para sumar otro.';
  end if;
  if exists (select 1 from public.restaurant_claims where user_id = v_user and status = 'pending') then
    raise exception 'Ya tienes una solicitud en revisión';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'Escribe tu nombre completo';
  end if;
  if char_length(regexp_replace(v_wa, '\D', '', 'g')) < 7 then
    raise exception 'Escribe un WhatsApp válido';
  end if;
  if p_photo_path is null or p_photo_path not like v_user::text || '/claims/%' then
    raise exception 'Falta la foto de prueba';
  end if;

  insert into public.restaurant_claims (restaurant_id, user_id, full_name, whatsapp, rif, photo_path)
  values (p_restaurant_id, v_user, left(v_name, 80), left(v_wa, 20), left(v_rif, 20), p_photo_path)
  returning id into v_id;

  insert into public.notifications (recipient_id, type, title, body, data)
  select p.id,
         'moderation',
         'Reclamo de local por revisar',
         v_name || ' dice ser dueño de "' || v_rest.name || '". Revísalo en el panel.',
         jsonb_build_object('restaurant_id', p_restaurant_id, 'claim_id', v_id, 'kind', 'claim')
  from public.profiles p
  where p.is_admin;

  return v_id;
end;
$$;

revoke execute on function public.submit_restaurant_claim(uuid, text, text, text, text) from public, anon;
grant execute on function public.submit_restaurant_claim(uuid, text, text, text, text) to authenticated;

-- ─── Aprobar o rechazar ─────────────────────────────────────────────────────
create or replace function public.admin_review_claim(
  p_claim_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_claim public.restaurant_claims%rowtype;
  v_rest record;
  v_taken int;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin(v_admin) then
    raise exception 'not authorized';
  end if;

  select * into v_claim from public.restaurant_claims where id = p_claim_id for update;
  if v_claim.id is null then
    raise exception 'Solicitud no encontrada';
  end if;
  if v_claim.status <> 'pending' then
    raise exception 'Esta solicitud ya fue revisada';
  end if;

  select id, name, owner_id into v_rest
  from public.restaurants where id = v_claim.restaurant_id for update;

  if not p_approve then
    v_reason := coalesce(v_reason, 'No pudimos confirmar que el local es tuyo.');
    update public.restaurant_claims
      set status = 'rejected', reason = v_reason, reviewed_at = now(), reviewed_by = v_admin
      where id = p_claim_id;
    insert into public.notifications (recipient_id, type, title, body, data)
    values (v_claim.user_id, 'moderation', 'No pudimos aprobar tu solicitud', v_reason,
            jsonb_build_object('restaurant_id', v_rest.id, 'kind', 'claim_rejected'));
    insert into public.admin_audit_log (restaurant_id, admin_id, action, detail)
    values (v_rest.id, v_admin, 'claim_rejected', jsonb_build_object('reason', v_claim.full_name || ': ' || v_reason));
    return;
  end if;

  if v_rest.owner_id is not null then
    raise exception 'Este local ya tiene dueño';
  end if;
  if exists (select 1 from public.restaurants where owner_id = v_claim.user_id) then
    raise exception 'Esta persona ya tiene un local';
  end if;

  -- Mismo orden de regalos que un local nuevo: Original si quedan cupos; si
  -- no, la prueba de 3 meses (desde hoy, no desde la importación).
  perform pg_advisory_xact_lock(hashtext('elpoint_founder_rank'));
  select count(*) into v_taken from public.restaurants where founder_rank is not null;

  update public.restaurants
    set owner_id = v_claim.user_id,
        submitted_at = now(),
        rif = coalesce(v_claim.rif, rif),
        founder_rank = case when v_taken < 100 then v_taken + 1 end,
        paid_until = case when v_taken < 100 then null else now() + interval '3 months' end,
        plan_period_start = case when v_taken < 100 then null else now() end,
        plan_kind = case when v_taken < 100 then null else 'trial' end,
        boost_until = greatest(coalesce(boost_until, now()), now() + interval '14 days')
    where id = v_rest.id;

  update public.profiles set role = 'restaurant_owner' where id = v_claim.user_id;

  update public.restaurant_claims
    set status = 'approved', reason = null, reviewed_at = now(), reviewed_by = v_admin
    where id = p_claim_id;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (v_claim.user_id, 'moderation', '¡' || v_rest.name || ' ya es tuyo!',
          'Completa tu perfil: contacto, fotos, horario y menú.',
          jsonb_build_object('restaurant_id', v_rest.id, 'kind', 'claim_approved'));

  -- Si otras personas pidieron el mismo local, se les avisa.
  with others as (
    update public.restaurant_claims
      set status = 'rejected',
          reason = 'Otra persona demostró ser la dueña de este local.',
          reviewed_at = now(), reviewed_by = v_admin
      where restaurant_id = v_rest.id and status = 'pending'
      returning user_id
  )
  insert into public.notifications (recipient_id, type, title, body, data)
  select user_id, 'moderation', 'No pudimos aprobar tu solicitud',
         'Otra persona demostró ser la dueña de este local. Si es un error, escríbenos por Soporte.',
         jsonb_build_object('restaurant_id', v_rest.id, 'kind', 'claim_rejected')
  from others;

  insert into public.admin_audit_log (restaurant_id, admin_id, action, detail)
  values (v_rest.id, v_admin, 'claim_approved', jsonb_build_object('reason', v_claim.full_name));
end;
$$;

revoke execute on function public.admin_review_claim(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_claim(uuid, boolean, text) to authenticated;
