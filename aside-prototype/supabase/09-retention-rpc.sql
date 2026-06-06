-- ============================================================
-- 09-retention-rpc.sql — 開発部 日次レポート用「継続利用率(リテンション)」集計RPC
-- 個人データ（ニックネーム/user_id/ログ本体）は一切返さず、件数・率のみを返す。
-- 「アクティブな日」= その日(JST)に sessions がある日。匿名ID = public.users.user_id。
-- anon に EXECUTE 許可（公開キーで呼べるが、返るのは集計値のみ＝PIIなし）。
-- 適用: Supabase(aside-beta) SQL Editor で全文 RUN → notify pgrst で即露出。
-- 関連: 07-usage-summary-rpc.sql（日次集計）/ company リポ daily_usage_report ④継続利用率
-- ============================================================

create or replace function public.get_retention_summary()
returns jsonb
language sql security definer set search_path = public as $$
  with active_days as (
    -- 匿名ID(user_id)ごとの「アクティブな日(JST)」の集合（重複日は1日に畳む）
    select s.user_id, (s.started_at at time zone 'Asia/Tokyo')::date as d
    from public.sessions s
    group by 1, 2
  ),
  per_user as (
    select user_id,
           count(*)  as active_day_count,   -- 何日アクティブだったか
           min(d)    as first_day,
           max(d)    as last_day
    from active_days
    group by user_id
  )
  select jsonb_build_object(
    'as_of',                (current_timestamp at time zone 'Asia/Tokyo')::date,
    'total_users',          (select count(*) from per_user),
    -- ★社長指定の指標: 2日以上アクティブだった匿名IDの数 と その率
    'retained_2plus_days',  (select count(*) from per_user where active_day_count >= 2),
    'retention_rate_2plus', (select round(100.0 * count(*) filter (where active_day_count >= 2)
                                          / nullif(count(*), 0), 1) from per_user),
    'retained_3plus_days',  (select count(*) from per_user where active_day_count >= 3),
    -- アクティブ日数の分布（例 {"1": 9, "2": 3, "3": 1}）＝ 何日続いた人が何人か
    'active_day_distribution', (
      select coalesce(jsonb_object_agg(active_day_count::text, n), '{}'::jsonb)
      from (select active_day_count, count(*) as n from per_user group by 1) x
    ),
    -- コホート近似: 初回日より後・初回日+N日以内に再訪した匿名IDの数（D1/D3/D7/D30）
    -- ※分母は total_users（直近登録で N 日未経過のユーザーも含むため、初期は過小評価になる点に留意）
    'returning_within', jsonb_build_object(
      'd1',  (select count(*) from per_user pu where exists (
                select 1 from active_days a where a.user_id = pu.user_id
                and a.d > pu.first_day and a.d <= pu.first_day + 1)),
      'd3',  (select count(*) from per_user pu where exists (
                select 1 from active_days a where a.user_id = pu.user_id
                and a.d > pu.first_day and a.d <= pu.first_day + 3)),
      'd7',  (select count(*) from per_user pu where exists (
                select 1 from active_days a where a.user_id = pu.user_id
                and a.d > pu.first_day and a.d <= pu.first_day + 7)),
      'd30', (select count(*) from per_user pu where exists (
                select 1 from active_days a where a.user_id = pu.user_id
                and a.d > pu.first_day and a.d <= pu.first_day + 30))
    )
  );
$$;

revoke all on function public.get_retention_summary() from public;
grant execute on function public.get_retention_summary() to anon;

notify pgrst, 'reload schema';
