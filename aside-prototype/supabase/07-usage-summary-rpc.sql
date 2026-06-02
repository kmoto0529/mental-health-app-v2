-- ============================================================
-- 07-usage-summary-rpc.sql — 開発部 日次レポート用「集計専用」RPC
-- 個人データ（ニックネーム/user_id/ログ本体）は一切返さず、件数のみを返す。
-- anon に EXECUTE 許可（公開キーで呼べるが、返るのは集計値のみ＝PIIなし）。
-- 適用: SQL Editor で RUN → notify pgrst で即露出。
-- ============================================================

create or replace function public.get_daily_usage_summary(p_date date default current_date)
returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'date',          p_date,
    'active_users',  (select count(distinct user_id) from public.sessions  where (started_at  at time zone 'Asia/Tokyo')::date = p_date),
    'new_users',     (select count(*)                from public.users     where (created_at  at time zone 'Asia/Tokyo')::date = p_date),
    'sessions',      (select count(*)                from public.sessions  where (started_at  at time zone 'Asia/Tokyo')::date = p_date),
    'actions_done',  (select count(*) from public.action_log where status = 'done' and (completed_at at time zone 'Asia/Tokyo')::date = p_date),
    'content', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'content', content_key,
               'tab',     tab,
               'opens',   opens,      -- そのコンテンツを開いた回数
               'dones',   dones,      -- 完了回数
               'users',   users       -- 操作したユニークユーザー数
             ) order by opens desc), '[]'::jsonb)
      from (
        select e.payload->>'content' as content_key,
               e.payload->>'tab'     as tab,
               count(*) filter (where e.event_type = 'content_open') as opens,
               count(*) filter (where e.event_type = 'content_done') as dones,
               count(distinct e.user_id)                             as users
        from public.app_events e
        where e.event_type in ('content_open','content_done')
          and (e.created_at at time zone 'Asia/Tokyo')::date = p_date
        group by 1, 2
      ) c
    )
  );
$$;

revoke all on function public.get_daily_usage_summary(date) from public;
grant execute on function public.get_daily_usage_summary(date) to anon;

notify pgrst, 'reload schema';
