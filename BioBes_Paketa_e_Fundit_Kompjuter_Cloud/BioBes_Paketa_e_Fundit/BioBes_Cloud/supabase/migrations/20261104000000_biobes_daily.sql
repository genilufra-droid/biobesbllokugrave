-- BioBes Blloku Ditor: independent, private single-owner storage.
-- Run as project administrator, never from the browser. Existing app tables are not changed.

create table if not exists public.biobes_daily_installation (
  id boolean primary key default true check (id),
  bucket_id text not null,
  installed_at timestamptz not null default now()
);
create table if not exists public.biobes_daily_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
-- This edition is intentionally for ONE account. Remove only as part of a reviewed multi-user upgrade.
create unique index if not exists biobes_daily_one_owner on public.biobes_daily_access ((true));

create table if not exists public.biobes_daily_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  next_nr integer not null default 1 check (next_nr between 1 and 1000000000),
  catalog jsonb not null default '{"responsibles":[],"products":[],"employees":[],"packages":[],"statuses":[],"units":[],"sources":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.biobes_daily_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null check (record_id ~ '^[A-Za-z0-9._-]{1,120}$'),
  record_number integer not null check (record_number between 1 and 999999999),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, record_id),
  unique (user_id, record_number)
);
create table if not exists public.biobes_daily_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  result_revision bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
create table if not exists public.biobes_daily_ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hour_start timestamptz not null,
  day_start timestamptz not null,
  hour_count integer not null default 0,
  day_count integer not null default 0
);

alter table public.biobes_daily_installation enable row level security;
alter table public.biobes_daily_access enable row level security;
alter table public.biobes_daily_state enable row level security;
alter table public.biobes_daily_records enable row level security;
alter table public.biobes_daily_operations enable row level security;
alter table public.biobes_daily_ai_usage enable row level security;
-- No direct browser access: narrowly-scoped SECURITY DEFINER functions below validate auth.uid().
revoke all on public.biobes_daily_installation, public.biobes_daily_access, public.biobes_daily_state, public.biobes_daily_records,
  public.biobes_daily_operations, public.biobes_daily_ai_usage from public, anon, authenticated;

create or replace function public.biobes_daily_has_access()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.biobes_daily_access a where a.user_id = auth.uid()
  );
$$;
-- This predicate only checks the caller's own JWT identity. Public execution is needed
-- for the restrictive Storage fence below, including anonymous/custom roles.
grant execute on function public.biobes_daily_has_access() to public;

create or replace function public.biobes_daily_snapshot()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if not public.biobes_daily_has_access() then
    raise exception using message = 'BIOBES_FORBIDDEN', errcode = '42501';
  end if;
  insert into public.biobes_daily_state(user_id) values (v_user) on conflict (user_id) do nothing;
  -- One SELECT provides one MVCC snapshot of the revision, catalog, and records.
  select jsonb_build_object(
    'revision', s.revision,
    'data', jsonb_build_object('version', 1, 'nextNr', s.next_nr, 'catalog', s.catalog,
      'records', coalesce((select jsonb_agg(r.data order by r.record_number, r.record_id)
        from public.biobes_daily_records r where r.user_id = v_user), '[]'::jsonb))
  ) into v_result from public.biobes_daily_state s where s.user_id = v_user;
  return v_result;
end;
$$;
revoke all on function public.biobes_daily_snapshot() from public, anon;
grant execute on function public.biobes_daily_snapshot() to authenticated;

-- Atomic delta commit, revision-checked and idempotent. A lost HTTP response can be retried
-- with the SAME operation_id; its already-committed result will be returned without reapplying.
create or replace function public.biobes_daily_write(
  p_expected_revision bigint, p_operation_id uuid, p_next_nr integer,
  p_catalog jsonb, p_upserts jsonb, p_deletes text[]
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid(); v_rev bigint; v_done bigint; v_item jsonb; v_id text; v_nr text;
begin
  if not public.biobes_daily_has_access() then
    raise exception using message = 'BIOBES_FORBIDDEN', errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_operation_id is null
     or p_next_nr is null or p_next_nr not between 1 and 1000000000
     or jsonb_typeof(p_catalog) is distinct from 'object'
     or jsonb_typeof(p_upserts) is distinct from 'array' or p_deletes is null then
    raise exception using message = 'BIOBES_INVALID_INPUT', errcode = '22023';
  end if;
  if pg_catalog.octet_length(p_catalog::text) > 1000000
     or pg_catalog.octet_length(p_upserts::text) > 16000000
     or jsonb_array_length(p_upserts) > 5000 or cardinality(p_deletes) > 5000 then
    raise exception using message = 'BIOBES_INPUT_TOO_LARGE', errcode = '22023';
  end if;
  if exists (select 1 from pg_catalog.unnest(array['products','employees','packages','statuses','units','sources']) k
             where jsonb_typeof(p_catalog -> k) is distinct from 'array')
     or ((p_catalog ? 'responsibles') and jsonb_typeof(p_catalog -> 'responsibles') is distinct from 'array') then
    raise exception using message = 'BIOBES_INVALID_CATALOG', errcode = '22023';
  end if;
  insert into public.biobes_daily_state(user_id) values (v_user) on conflict (user_id) do nothing;
  select revision into v_rev from public.biobes_daily_state where user_id = v_user for update;
  select result_revision into v_done from public.biobes_daily_operations
    where user_id = v_user and operation_id = p_operation_id;
  if found then return jsonb_build_object('revision', v_done, 'replayed', true); end if;
  if v_rev <> p_expected_revision then
    raise exception using message = 'BIOBES_CONFLICT', errcode = '40001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_upserts) as t(x)
             group by x->>'id' having count(*) > 1) then
    raise exception using message = 'BIOBES_DUPLICATE_ID', errcode = '22023';
  end if;
  if exists (select 1 from pg_catalog.unnest(p_deletes) as t(x)
             where x is null or x !~ '^[A-Za-z0-9._-]{1,120}$') then
    raise exception using message = 'BIOBES_INVALID_ID', errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_upserts) loop
    v_id := v_item->>'id'; v_nr := v_item->>'nr';
    if jsonb_typeof(v_item) is distinct from 'object' or v_id is null
       or v_id !~ '^[A-Za-z0-9._-]{1,120}$' or v_nr is null
       or v_nr !~ '^[0-9]{1,9}$' or v_nr::integer < 1 or v_id = any(p_deletes) then
      raise exception using message = 'BIOBES_INVALID_RECORD', errcode = '22023';
    end if;
  end loop;
  delete from public.biobes_daily_records where user_id = v_user and record_id = any(p_deletes);
  for v_item in select value from jsonb_array_elements(p_upserts) loop
    insert into public.biobes_daily_records(user_id, record_id, record_number, data, updated_at)
      values (v_user, v_item->>'id', (v_item->>'nr')::integer, v_item, now())
    on conflict (user_id, record_id) do update
      set record_number = excluded.record_number, data = excluded.data, updated_at = excluded.updated_at;
  end loop;
  update public.biobes_daily_state set revision = v_rev + 1, next_nr = p_next_nr,
    catalog = p_catalog, updated_at = now() where user_id = v_user;
  insert into public.biobes_daily_operations(user_id, operation_id, result_revision)
    values (v_user, p_operation_id, v_rev + 1);
  -- Keep idempotency keys for 90 days. A very old retry is rejected by revision checking.
  delete from public.biobes_daily_operations where user_id = v_user and created_at < now() - interval '90 days';
  return jsonb_build_object('revision', v_rev + 1, 'replayed', false);
end;
$$;
revoke all on function public.biobes_daily_write(bigint, uuid, integer, jsonb, jsonb, text[]) from public, anon;
grant execute on function public.biobes_daily_write(bigint, uuid, integer, jsonb, jsonb, text[]) to authenticated;

-- Conservative per-account cap. This limits requests, not a monetary budget.
create or replace function public.biobes_daily_claim_ai()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); h timestamptz := date_trunc('hour', now());
  d timestamptz := date_trunc('day', now()); u public.biobes_daily_ai_usage%rowtype;
begin
  if not public.biobes_daily_has_access() then
    raise exception using message = 'BIOBES_FORBIDDEN', errcode = '42501';
  end if;
  insert into public.biobes_daily_ai_usage(user_id, hour_start, day_start)
    values(v_user, h, d) on conflict (user_id) do nothing;
  select * into u from public.biobes_daily_ai_usage where user_id = v_user for update;
  if u.hour_start <> h then u.hour_start := h; u.hour_count := 0; end if;
  if u.day_start <> d then u.day_start := d; u.day_count := 0; end if;
  if u.hour_count >= 30 or u.day_count >= 150 then
    raise exception using message = 'BIOBES_AI_LIMIT', errcode = 'P0001';
  end if;
  update public.biobes_daily_ai_usage set hour_start=u.hour_start, day_start=u.day_start,
    hour_count=u.hour_count+1, day_count=u.day_count+1 where user_id=v_user;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.biobes_daily_claim_ai() from public, anon;
grant execute on function public.biobes_daily_claim_ai() to authenticated;

-- Never take over an unrelated existing bucket, even if it is private. The marker is
-- written only by this installation after the bucket has been successfully created.
do $$ begin
  if exists (select 1 from storage.buckets where id='biobes-daily-documents-private')
     and not exists (select 1 from public.biobes_daily_installation
                     where id=true and bucket_id='biobes-daily-documents-private') then
    raise exception 'BIOBES_BUCKET_ALREADY_EXISTS: inspect or choose a different project';
  end if;
  if exists (select 1 from public.biobes_daily_installation
             where id=true and bucket_id <> 'biobes-daily-documents-private') then
    raise exception 'BIOBES_INSTALLATION_CONFLICT';
  end if;
end $$;
insert into storage.buckets (id, name, public, file_size_limit)
  values ('biobes-daily-documents-private', 'biobes-daily-documents-private', false, 12582912)
  on conflict (id) do nothing;
do $$ begin
  if exists (select 1 from storage.buckets where id='biobes-daily-documents-private' and public is distinct from false) then
    raise exception 'BIOBES_BUCKET_NOT_PRIVATE';
  end if;
end $$;
insert into public.biobes_daily_installation(id,bucket_id)
  values(true,'biobes-daily-documents-private') on conflict(id) do nothing;
drop policy if exists "biobes_daily_read_own" on storage.objects;
create policy "biobes_daily_read_own" on storage.objects for select to authenticated
  using (bucket_id='biobes-daily-documents-private' and (storage.foldername(name))[1]=auth.uid()::text and public.biobes_daily_has_access());
drop policy if exists "biobes_daily_insert_own" on storage.objects;
create policy "biobes_daily_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id='biobes-daily-documents-private' and (storage.foldername(name))[1]=auth.uid()::text and public.biobes_daily_has_access());
drop policy if exists "biobes_daily_delete_own" on storage.objects;
create policy "biobes_daily_delete_own" on storage.objects for delete to authenticated
  using (bucket_id='biobes-daily-documents-private' and (storage.foldername(name))[1]=auth.uid()::text and public.biobes_daily_has_access());

-- A restrictive policy is an additional privacy fence for THIS bucket only. PostgreSQL
-- combines permissive policies with OR; without this fence a pre-existing broad policy
-- in a shared project could accidentally allow another user to read our private files.
drop policy if exists "biobes_daily_privacy_fence" on storage.objects;
create policy "biobes_daily_privacy_fence" on storage.objects as restrictive for all to public
  using (bucket_id is distinct from 'biobes-daily-documents-private' or
    (auth.uid() is not null and (storage.foldername(name))[1]=auth.uid()::text and public.biobes_daily_has_access()))
  with check (bucket_id is distinct from 'biobes-daily-documents-private' or
    (auth.uid() is not null and (storage.foldername(name))[1]=auth.uid()::text and public.biobes_daily_has_access()));
