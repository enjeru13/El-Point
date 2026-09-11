-- ═══════════════════════════════════════════════════════════════════════════
-- Paid plan for restaurants #101 onward. Founders (founder_rank set) never
-- touch any of this — they're free forever, checked separately in the app.
--
--   * restaurants.paid_until: null until first approval (founders: stays
--     null forever, checked via founder_rank instead). Non-founders get a
--     3-month free trial counted from their registration (submitted_at,
--     not the approval date — a slow review doesn't buy anyone extra
--     time), then need a payment to extend it. This migration only tracks
--     the date — nothing here hides a restaurant automatically when it
--     lapses; that's a deliberate future call once payment collection is
--     actually running end to end.
--   * restaurant_payments: one row per payment attempt (Bs a tasa BCV,
--     Binance, Bancolombia — all manual, no gateway integration possible
--     from Venezuela). Owner uploads a proof photo + reference, admin
--     approves or rejects it, same shape as the existing restaurant
--     verification-photo flow.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── restaurants.paid_until ─────────────────────────────────────────────────

alter table public.restaurants
  add column if not exists paid_until timestamptz;

comment on column public.restaurants.paid_until is
  'Non-founders only: listed for free/paid until this date. Founders (founder_rank set) ignore this — always free. Null + not founder = never had a trial granted yet.';

revoke update (paid_until) on public.restaurants from anon, authenticated;

create or replace function public.grant_trial_on_approval()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and new.founder_rank is null
     and new.paid_until is null then
    -- 3 meses desde el registro (submitted_at), no desde la aprobación —
    -- así una revisión lenta no le regala tiempo extra a nadie.
    new.paid_until := new.submitted_at + interval '3 months';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grant_trial_on_approval on public.restaurants;
create trigger trg_grant_trial_on_approval
  before update on public.restaurants
  for each row execute function public.grant_trial_on_approval();

-- Backfill: any restaurant already approved (and not a founder) that
-- somehow has no trial yet — safety net, not expected to touch any row
-- given founder backfill already covers everyone approved so far.
update public.restaurants
  set paid_until = submitted_at + interval '3 months'
  where status = 'approved' and founder_rank is null and paid_until is null;

-- ─── restaurant_payments ────────────────────────────────────────────────────

create table if not exists public.restaurant_payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  method text not null check (method in ('bs_bcv', 'binance', 'bancolombia')),
  reference text not null check (char_length(btrim(reference)) > 0),
  amount numeric(10, 2),
  proof_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id)
);

create index if not exists restaurant_payments_restaurant_idx
  on public.restaurant_payments (restaurant_id, submitted_at desc);

create index if not exists restaurant_payments_pending_idx
  on public.restaurant_payments (submitted_at)
  where status = 'pending';

alter table public.restaurant_payments enable row level security;

drop policy if exists "owner reads own payments" on public.restaurant_payments;
create policy "owner reads own payments"
  on public.restaurant_payments for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists "owner submits payment" on public.restaurant_payments;
create policy "owner submits payment"
  on public.restaurant_payments for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = (select auth.uid())
    )
  );

-- Resolving (approve/reject) only via the RPC below, not a raw PATCH.
revoke update on public.restaurant_payments from anon, authenticated;

grant select, insert on public.restaurant_payments to authenticated;

-- ─── Admin: approve/reject a payment ────────────────────────────────────────

create or replace function public.admin_resolve_payment(
  p_payment_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action';
  end if;

  select restaurant_id into v_restaurant_id
  from public.restaurant_payments
  where id = p_payment_id and status = 'pending';

  if v_restaurant_id is null then
    raise exception 'payment not found or already resolved';
  end if;

  update public.restaurant_payments
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
        note = p_note,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = p_payment_id;

  if p_action = 'approve' then
    update public.restaurants
      set paid_until = greatest(coalesce(paid_until, now()), now()) + interval '1 year'
      where id = v_restaurant_id;
  end if;
end;
$$;

grant execute on function public.admin_resolve_payment(uuid, text, text) to authenticated;

-- ─── Private bucket for payment proofs ──────────────────────────────────────
-- Path convention: "<owner_uid>/<restaurant_id>/<payment_id>.<ext>"

insert into storage.buckets (id, name, public, file_size_limit)
values ('restaurant-payments', 'restaurant-payments', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "payment proof owner insert" on storage.objects;
create policy "payment proof owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'restaurant-payments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "payment proof read own or admin" on storage.objects;
create policy "payment proof read own or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'restaurant-payments'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin((select auth.uid()))
    )
  );
