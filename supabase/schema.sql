-- Payapa: Supabase schema for milestone 7 sync.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again: it only creates what's missing and replaces the trigger function and policies.
--
-- Rules (see docs/superpowers/specs/2026-11-26-milestone-7-sync-design.md):
-- * Primary key (user_id, id): the five seed accounts have the same fixed ids on every phone.
-- * synced_at is the server's clock, set on every write; phones download by it.
-- * Last write wins: an update whose updated_at isn't newer than the stored row is skipped.
-- * Row Level Security: each user reads and writes only their own rows. No deletes (they're soft).
-- * Money is bigint centavos, dates are date, moments are timestamptz. No card numbers anywhere.

create table if not exists public.accounts (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text, short text, type text, network text, bank text,
  archived_at timestamptz,
  created_at timestamptz, updated_at timestamptz not null, deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table if not exists public.items (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text, kind text, category text, account_id uuid,
  start_date date, payday_bucket text, reminder_offsets jsonb, reminder_time text, notes text,
  total_payments integer, paid_before integer, schedule jsonb,
  archived_at timestamptz,
  created_at timestamptz, updated_at timestamptz not null, deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table if not exists public.cards (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text, type text, tone text, network text, provider text,
  credit_limit bigint, statement_day integer, due_day integer, account_id uuid,
  payday_bucket text, reminder_offsets jsonb,
  archived_at timestamptz,
  created_at timestamptz, updated_at timestamptz not null, deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table if not exists public.installments (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id uuid, description text, monthly_amount bigint, months integer, first_statement_date date,
  created_at timestamptz, updated_at timestamptz not null, deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table if not exists public.card_statements (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id uuid, statement_date date, due_date date, statement_balance bigint, minimum_due bigint,
  created_at timestamptz, updated_at timestamptz not null, deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table if not exists public.payments (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ref text, amount bigint, paid_on date, account_id uuid, reference_no text, note text,
  created_at timestamptz, updated_at timestamptz not null, deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

-- Stamps synced_at with the server clock, and skips an update that isn't newer (last write wins).
-- clock_timestamp() (not now()) so rows written in one request still get distinct, ordered times.
create or replace function public.payapa_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'items', 'cards', 'installments', 'card_statements', 'payments'] loop
    execute format('drop trigger if exists payapa_stamp on public.%I', t);
    execute format('create trigger payapa_stamp before insert or update on public.%I for each row execute function public.payapa_stamp()', t);

    execute format('create index if not exists %I on public.%I (user_id, synced_at)', t || '_user_synced', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Own rows: read" on public.%I', t);
    execute format('drop policy if exists "Own rows: add" on public.%I', t);
    execute format('drop policy if exists "Own rows: change" on public.%I', t);
    execute format('create policy "Own rows: read" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "Own rows: add" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "Own rows: change" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end;
$$;
