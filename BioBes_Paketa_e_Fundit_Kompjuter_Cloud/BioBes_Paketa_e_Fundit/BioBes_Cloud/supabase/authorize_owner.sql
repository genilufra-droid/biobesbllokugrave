-- Before running: create or identify the single confirmed Supabase Auth user.
-- Replace only the email below, then run as a project administrator in SQL Editor.
-- This does not change the project's global signup or authentication settings.
do $$
declare
  v_email text := 'VENDOS_EMAILIN_TEND_KETU';
  v_count integer;
  v_user uuid;
  v_existing uuid;
begin
  select count(*) into v_count from auth.users where lower(email)=lower(v_email);
  if v_count <> 1 then
    raise exception 'U gjetën % përdorues për emailin. Duhet saktësisht një përdorues Auth.', v_count;
  end if;
  select id into v_user from auth.users where lower(email)=lower(v_email);
  select user_id into v_existing from public.biobes_daily_access limit 1;
  if v_existing is not null and v_existing <> v_user then
    raise exception 'BioBes ka tashmë një përdorues tjetër të autorizuar. Mos e zëvendëso pa një migrim të kontrolluar.';
  end if;
  insert into public.biobes_daily_access(user_id) values(v_user) on conflict(user_id) do nothing;
end $$;
select 'BioBes: llogaria u autorizua' as rezultati;
