-- ============================================================
-- 06-content-engagement.sql — コンテンツ利用状況の集計ビュー
-- 「誰が・どのコンテンツを・どこまで進めたか」を一覧化する。
-- 元データ: app_events の content_open / content_step / content_done（INSERTのみ）
-- 適用: SQL Editor で RUN。以降 Table Editor から v_content_engagement をクリックで閲覧。
-- 注意: anon/authenticated/public には公開しない（外部読み出し防止）。
-- ============================================================

create or replace view public.v_content_engagement as
with ev as (
  select
    e.user_id,
    e.payload->>'content'              as content_key,
    e.payload->>'tab'                  as tab,
    e.event_type,
    nullif(e.payload->>'step','')::int  as step,
    nullif(e.payload->>'total','')::int as total,
    e.created_at
  from public.app_events e
  where e.event_type in ('content_open','content_step','content_done')
)
select
  coalesce(nullif(u.nickname,''),'(未設定)') as "ニックネーム",
  case ev.tab when 'home' then 'ホーム' when 'ippo' then 'いっぽ'
              when 'kizuki' then 'きづき' when 'record' then 'きろく' else ev.tab end as "タブ",
  case ev.content_key
    when 'mood_check'          then '今の気持ち'
    when 'moyamoya'            then 'もやもや整理'
    when 'column_method'       then 'コラム法'
    when 'ippo_action'         then '行動実施'
    when 'downward_arrow'      then '下向き矢印法'
    when 'behavior_experiment' then '行動実験'
    when 'stimulus_control'    then '刺激統制'
    when 'calendar'            then 'カレンダー'
    when 'trend'               then '傾向分析'
    when 'distortion'          then '思考のクセ分析'
    else ev.content_key end as "コンテンツ",
  count(*) filter (where ev.event_type = 'content_open') as "開いた回数",
  max(ev.step)                                           as "到達ステップ",
  max(ev.total)                                          as "全ステップ",
  count(*) filter (where ev.event_type = 'content_done') as "完了回数",
  max(ev.created_at)                                     as "最終実施",
  ev.user_id                                             as "匿名ID"
from ev
join public.users u on u.user_id = ev.user_id
group by ev.user_id, u.nickname, ev.tab, ev.content_key;

revoke all on public.v_content_engagement from anon, authenticated, public;
