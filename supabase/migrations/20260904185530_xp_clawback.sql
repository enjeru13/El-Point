-- Close the XP farming gap: deleting a review (or an unmark of "helpful"),
-- or an admin removing a review via moderation, must claw back the XP it
-- earned — otherwise submit-then-delete (or unmark-then-remark) is free,
-- unlimited XP, and a moderated-away review still permanently boosted the
-- author's level.
--
-- Design:
--   * review_helpful.review_author_id is denormalized at insert time so its
--     own delete trigger never has to look up the parent review — safe even
--     when that delete is a cascade from the review itself disappearing.
--   * reviews.xp_reverted marks a review whose +10 was already clawed back
--     by moderation, so a later hard-delete of that same (already-removed)
--     review doesn't subtract it a second time.
--   * Moderation removal proactively deletes the review's review_helpful
--     rows (instead of separately re-computing their XP) so the existing
--     per-row reversal trigger below does that work once, not twice.

alter table public.reviews
  add column if not exists xp_reverted boolean not null default false;

alter table public.review_helpful
  add column if not exists review_author_id uuid references public.profiles (id) on delete set null;

update public.review_helpful rh
set review_author_id = rv.author_id
from public.reviews rv
where rh.review_id = rv.id and rh.review_author_id is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Denormalize the review's author onto each review_helpful row at insert time.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_review_helpful_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select author_id into new.review_author_id
  from public.reviews where id = new.review_id;
  return new;
end;
$$;

drop trigger if exists trg_set_review_helpful_author on public.review_helpful;
create trigger trg_set_review_helpful_author
  before insert on public.review_helpful
  for each row execute function public.set_review_helpful_author();

-- ─────────────────────────────────────────────────────────────────────────────
-- Unmarking "helpful" (or its row disappearing via cascade) reverts the +2.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.revert_xp_on_helpful_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.review_author_id is not null and old.review_author_id <> old.user_id then
    perform public.award_xp(old.review_author_id, -2);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_revert_xp_on_helpful_delete on public.review_helpful;
create trigger trg_revert_xp_on_helpful_delete
  after delete on public.review_helpful
  for each row execute function public.revert_xp_on_helpful_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- Deleting a review reverts its +10 — unless moderation already clawed it back.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.revert_xp_on_review_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not old.xp_reverted then
    perform public.award_xp(old.author_id, -10);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_revert_xp_on_review_delete on public.reviews;
create trigger trg_revert_xp_on_review_delete
  after delete on public.reviews
  for each row execute function public.revert_xp_on_review_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- Moderation removal claws back everything the review ever earned.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.on_review_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_strikes int;
begin
  if new.moderation = 'removed' and old.moderation <> 'removed' then
    perform set_config('app.elpoint_privileged', 'on', true);

    update public.profiles
      set strikes = strikes + 1
      where id = new.author_id
      returning strikes into v_strikes;

    if v_strikes >= 3 then
      update public.profiles set banned_at = now() where id = new.author_id and banned_at is null;
    end if;

    if not new.xp_reverted then
      -- Deleting these fires trg_revert_xp_on_helpful_delete per row, which
      -- claws back their +2 each — so we don't recompute that sum here.
      delete from public.review_helpful where review_id = new.id;
      perform public.award_xp(new.author_id, -10);
      update public.reviews set xp_reverted = true where id = new.id;
    end if;

    perform set_config('app.elpoint_privileged', 'off', true);
  end if;
  return null;
end;
$$;
