-- ============================================================
-- 10-invited-only-metrics.sql — 集計に「招待コード保持者だけ」の指標を追加する
--
-- 背景:
--   v0.9.96 より前は、招待コードのゲートがオンボーディングの最後にあった。
--   URLを開けば誰でも 同意 → nickname → profile まで進めてしまい、
--   その時点で user row と consent_at が作られていた。
--   結果、累計ユニーク数に「招待コードを持たず、入口で弾かれた人」が混ざっている。
--   （例: 2026-09-02 の新規1人は iOS Safari から来てプロフィール画面で離脱）
--
--   v0.9.96 でゲートを先頭へ移したので今後の混入は止まるが、
--   過去分は残るため、集計側で「コード保持者だけ」を分けて出せるようにする。
--
-- 方針:
--   既存キーは一切変えず、*_invited 系のキーを「追加」するだけにする。
--   → GitHub Actions が集めている過去の JSON や、開発部レポートの様式を壊さない。
--
-- ⚠️ セキュリティ上の注意:
--   これらの RPC は anon（公開キー）から実行できる。
--   したがって invite_code の「値そのもの」は絶対に返さないこと。
--   招待コードは入館証であり、一覧が取れると誰でもβに入れてしまう。
--   コード別の内訳が見たいときは、SQL Editor から既存の public.v_invite_channel
--   （anon に revoke 済み）を参照すること。
--
-- 適用: Supabase(aside-beta) SQL Editor で全文 RUN → notify pgrst で即露出。
-- 関連: 07-usage-summary-rpc.sql / 09-retention-rpc.sql / 08-invite-code.sql
-- ============================================================


-- ------------------------------------------------------------
-- 1) 継続利用率: 招待コード保持者だけの指標を追加
-- ------------------------------------------------------------
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
    select a.user_id,
           count(*)  as active_day_count,   -- 何日アクティブだったか
           min(a.d)  as first_day,
           max(a.d)  as last_day,
           -- 招待コードを保持しているか（値は返さない。真偽だけ使う）
           (u.invite_code is not null and u.invite_code <> '') as invited
    from active_days a
    left join public.users u on u.user_id = a.user_id
    group by a.user_id, u.invite_code
  )
  select jsonb_build_object(
    'as_of',                (current_timestamp at time zone 'Asia/Tokyo')::date,
    'total_users',          (select count(*) from per_user),
    'retained_2plus_days',  (select count(*) from per_user where active_day_count >= 2),
    'retention_rate_2plus', (select round(100.0 * count(*) filter (where active_day_count >= 2)
                                          / nullif(count(*), 0), 1) from per_user),
    'retained_3plus_days',  (select count(*) from per_user where active_day_count >= 3),
    'active_day_distribution', (
      select coalesce(jsonb_object_agg(active_day_count::text, n), '{}'::jsonb)
      from (select active_day_count, count(*) as n from per_user group by 1) x
    ),
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
    ),

    -- ===== ここから追加分（招待コード保持者だけ＝「実質のβ利用者」） =====
    'invited', jsonb_build_object(
      'total_users',          (select count(*) from per_user where invited),
      'retained_2plus_days',  (select count(*) from per_user where invited and active_day_count >= 2),
      'retention_rate_2plus', (select round(100.0 * count(*) filter (where active_day_count >= 2)
                                            / nullif(count(*), 0), 1)
                               from per_user where invited),
      'retained_3plus_days',  (select count(*) from per_user where invited and active_day_count >= 3),
      'active_day_distribution', (
        select coalesce(jsonb_object_agg(active_day_count::text, n), '{}'::jsonb)
        from (select active_day_count, count(*) as n from per_user where invited group by 1) y
      )
    ),
    -- コード未登録＝入口で弾かれた人の数（差分の説明に使う）
    'users_without_invite_code', (select count(*) from per_user where not invited)
  );
$$;

revoke all on function public.get_retention_summary() from public;
grant execute on function public.get_retention_summary() to anon;


-- ------------------------------------------------------------
-- 2) 日次集計: 招待コード保持者だけの人数を追加
-- ------------------------------------------------------------
create or replace function public.get_daily_usage_summary(p_date date default current_date)
returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'date',          p_date,
    'active_users',  (select count(distinct user_id) from public.sessions  where (started_at  at time zone 'Asia/Tokyo')::date = p_date),
    'new_users',     (select count(*)                from public.users     where (created_at  at time zone 'Asia/Tokyo')::date = p_date),
    'sessions',      (select count(*)                from public.sessions  where (started_at  at time zone 'Asia/Tokyo')::date = p_date),
    'actions_done',  (select count(*) from public.action_log where status = 'done' and (completed_at at time zone 'Asia/Tokyo')::date = p_date),

    -- ===== 追加分: 招待コード保持者だけ =====
    'active_users_invited', (
      select count(distinct s.user_id)
      from public.sessions s
      join public.users u on u.user_id = s.user_id
      where (s.started_at at time zone 'Asia/Tokyo')::date = p_date
        and u.invite_code is not null and u.invite_code <> ''
    ),
    'new_users_invited', (
      select count(*)
      from public.users u
      where (u.created_at at time zone 'Asia/Tokyo')::date = p_date
        and u.invite_code is not null and u.invite_code <> ''
    ),

    'content', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'content', content_key,
               'tab',     tab,
               'opens',   opens,
               'dones',   dones,
               'users',   users
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
