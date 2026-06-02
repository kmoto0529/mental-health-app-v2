-- ============================================================
-- 05-monitoring-views.sql — Table Editor でクリック閲覧するためのモニタリング用ビュー
-- 適用先: Supabase `aside-beta`
-- 実行: SQL Editor で1回 RUN するだけ。以降は Table Editor から各ビューをクリックで閲覧・並替・絞込可能。
-- 注意: anon/authenticated には公開しない（外部読み出し防止）。ダッシュボード(postgres)でのみ閲覧。
-- ============================================================

-- ① 参加者一覧（プロフィール＋利用状況。日本語ラベル済み）
create or replace view public.v_customer_list as
select
  coalesce(nullif(u.nickname,''),'(未設定)') as "ニックネーム",
  case u.occupation when 'student' then '学生' when 'worker' then '社会人' when 'other' then 'その他' else '(未設定)' end as "立場",
  case u.age_range when '10s' then '10代' when '20s' then '20代' when '30s' then '30代'
                   when '40s' then '40代' when '50s' then '50代' when '60plus' then '60代以上' else '(未設定)' end as "年代",
  case u.gender when 'female' then '女性' when 'male' then '男性' when 'other' then 'その他'
                when 'no_answer' then '回答しない' else '(未設定)' end as "性別",
  count(distinct s.session_id)                                    as "来訪回数",
  count(distinct ad.id) filter (where ad.status = 'done')         as "行動完了数",
  max(s.started_at)                                               as "最終利用",
  u.consent_at                                                    as "同意日時",
  u.first_seen_platform                                          as "端末",
  u.user_id                                                       as "匿名ID"
from public.users u
left join public.sessions   s  on s.user_id  = u.user_id
left join public.action_log ad on ad.user_id = u.user_id
group by u.user_id;

-- ② 顧客 × 行動ログ（ニックネーム付き。状態/メモ/反応で絞り込み可）
create or replace view public.v_customer_actions as
select
  coalesce(nullif(u.nickname,''),'(未設定)') as "ニックネーム",
  a.action_id     as "行動ID",
  a.status        as "状態",
  a.difficulty    as "難易度",
  a.memo_text     as "メモ",
  a.reaction      as "反応",
  a.started_at    as "開始",
  a.completed_at  as "完了",
  u.user_id       as "匿名ID"
from public.action_log a
join public.users u on u.user_id = a.user_id;

-- ③ 顧客 × 全行動タイムライン（ニックネーム付き。1人の動きを時系列で）
create or replace view public.v_customer_timeline as
select
  coalesce(nullif(u.nickname,''),'(未設定)') as "ニックネーム",
  j.occurred_at as "日時",
  j.event       as "種別",
  j.details     as "内容",
  j.user_id     as "匿名ID"
from public.v_user_journey j
join public.users u on u.user_id = j.user_id;

-- ----- 外部公開を防ぐ: anon/authenticated/public から閲覧権を剥がす -----
revoke all on public.v_customer_list     from anon, authenticated, public;
revoke all on public.v_customer_actions  from anon, authenticated, public;
revoke all on public.v_customer_timeline from anon, authenticated, public;
