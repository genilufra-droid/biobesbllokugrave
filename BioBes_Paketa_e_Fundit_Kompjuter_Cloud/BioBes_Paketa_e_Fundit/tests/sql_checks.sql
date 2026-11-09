-- BioBes SQL audit checks. Run against a TEST Supabase project only:
--   psql "$DATABASE_URL" -f tests/sql_checks.sql
-- These queries are read-only and do not migrate or deploy anything.

-- 1. Every BioBes table must have row-level security enabled.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename like 'biobes_daily%'
order by tablename;

-- 2. The private document bucket must not be public.
select id, name, public, file_size_limit
from storage.buckets
where id = 'biobes-daily-documents-private';

-- 3. The AI claim function and allowlist helper must exist.
select proname, prosecdef
from pg_proc
where proname in ('biobes_daily_claim_ai', 'biobes_daily_has_access')
order by proname;

-- 4. The AI claim function must enforce the hourly/daily limits.
select pg_get_functiondef(oid) as definition
from pg_proc
where proname = 'biobes_daily_claim_ai';

-- 5. Policies must exist for the private bucket.
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
