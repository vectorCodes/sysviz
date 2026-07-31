-- SysViz database schema (Supabase / Postgres)
-- Run in the Supabase SQL editor, or `supabase db push` with the CLI.

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  referral_code text unique default substr(md5(random()::text), 1, 8),
  created_at  timestamptz not null default now()
);

-- ── entitlements (drives free vs pro gating) ────────────────────────────────
create table if not exists public.entitlements (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  plan         text not null default 'free' check (plan in ('free', 'pro')),
  status       text not null default 'inactive' check (status in ('active', 'inactive')),
  access_until timestamptz,
  updated_at   timestamptz not null default now()
);

-- ── payments (Polar checkout/order records) ─────────────────────────────────
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  plan_id      text not null,
  provider     text not null default 'polar',
  checkout_id  text,
  order_id     text,
  status       text not null default 'created',  -- created | paid
  created_at   timestamptz not null default now()
);

create index if not exists idx_payments_user_id on public.payments (user_id);

-- ── coupons ─────────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  code        text primary key,
  percent_off integer not null check (percent_off between 1 and 100),
  active      boolean not null default true,
  expires_at  timestamptz
);

-- ── referrals ───────────────────────────────────────────────────────────────
create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer     uuid not null references auth.users (id) on delete cascade,
  referred     uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (referred)
);

create index if not exists idx_referrals_referrer on public.referrals (referrer);
create index if not exists idx_referrals_referred on public.referrals (referred);

-- ── lesson_progress ─────────────────────────────────────────────────────────
create table if not exists public.lesson_progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  lesson_slug text not null,
  completed   boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, lesson_slug)
);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.entitlements   enable row level security;
alter table public.payments       enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.coupons        enable row level security;
alter table public.referrals      enable row level security;

-- Users can read/update only their own rows. Writes to entitlements/payments
-- happen from Edge Functions using the service role, which bypasses RLS.
-- auth.uid() is wrapped in a subselect so the planner evaluates it once per
-- query (initplan) instead of once per row.
create policy "own profile"      on public.profiles       for all    using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "read own ent"     on public.entitlements   for select using ((select auth.uid()) = user_id);
create policy "insert own ent"   on public.entitlements   for insert with check ((select auth.uid()) = user_id);
create policy "read own pay"     on public.payments       for select using ((select auth.uid()) = user_id);
create policy "own progress"     on public.lesson_progress for all   using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "read coupons"     on public.coupons        for select using (active = true);
create policy "read own referrals" on public.referrals    for select using ((select auth.uid()) = referrer or (select auth.uid()) = referred);

-- ── Table privileges ────────────────────────────────────────────────────────
-- PostgREST checks SQL GRANTs *and* RLS. RLS restricts which rows a role sees;
-- these GRANTs are what let the anon/authenticated roles touch the table at all.
-- Row scoping is still fully enforced by the policies above.
grant select on public.coupons to anon, authenticated;
grant select, insert on public.entitlements to authenticated;
grant select on public.payments, public.referrals to authenticated;
grant select, insert, update, delete on public.profiles, public.lesson_progress to authenticated;

-- Edge Functions authenticate as service_role: it bypasses RLS but STILL needs
-- table privileges to write entitlements/payments from the Polar webhook.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;

-- ── Auto-provision profile + free entitlement on signup ─────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
  insert into public.entitlements (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
