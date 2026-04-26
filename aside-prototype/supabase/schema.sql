-- ============================================================
-- Aside (ひといき) β版 ログ基盤スキーマ  v1.0
-- 対象: 10-20人 / 1ヶ月検証
-- 作成: 2026-04-23
--
-- 適用方法: Supabase Dashboard > SQL Editor に貼り付けて実行
-- 前提: gen_random_uuid() が使える（Supabase標準で有効）
-- ============================================================


-- ============================================================
-- Priority A: 最小ログ基盤（先にこれだけ動かす）
-- ============================================================

-- ------------------------------------------------------------
-- users: 匿名ID管理
-- ------------------------------------------------------------
create table public.users (
  user_id                 uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  consent_at              timestamptz,
  consent_version         text,
  first_seen_app_version  text,
  first_seen_platform     text,
  first_seen_user_agent   text
);

comment on table public.users is 'β参加者の匿名ID管理（クライアントでuuid発行→localStorage保存）';


-- ------------------------------------------------------------
-- sessions: 利用セッション（前景化→30分無操作で終了）
-- ------------------------------------------------------------
create table public.sessions (
  session_id    uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(user_id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  entry_point   text,                       -- 'direct' / 'home_screen' / 'notification' など
  mood_before   smallint,                   -- 1-5  (つらい/いまいち/ふつう/まあいい/とてもいい)
  mood_after    smallint,                   -- 1-5
  app_version   text not null,
  platform      text not null,              -- 'ios-safari' / 'android-chrome' / 'web-desktop' など
  user_agent    text
);

create index idx_sessions_user_started on public.sessions(user_id, started_at desc);

comment on table public.sessions is '1セッション=起動〜30分無操作で終了。mood_before/after でセッション前後の気分変化を計測';


-- ------------------------------------------------------------
-- emotion_log: 気持ちチェック
-- ------------------------------------------------------------
create table public.emotion_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(user_id) on delete cascade,
  session_id     uuid references public.sessions(session_id) on delete set null,
  recorded_at    timestamptz not null default now(),
  emotion_level  smallint not null check (emotion_level between 1 and 5),
  note           text,
  app_version    text not null,
  platform       text not null
);

create index idx_emotion_user_recorded on public.emotion_log(user_id, recorded_at desc);

comment on table public.emotion_log is '日々の気持ちチェック記録（mood-screen で記録するもの）';


-- ------------------------------------------------------------
-- action_log: 行動実行（最重要KPI源）
-- ------------------------------------------------------------
create table public.action_log (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.users(user_id) on delete cascade,
  session_id             uuid references public.sessions(session_id) on delete set null,
  action_id              text not null,                                                     -- 'act_mood_one' 等（prototype内のカタログID）
  theme_id               text,
  action_execution_type  text not null check (action_execution_type in ('instant_done','memo_done','ai_assist','choice_done')),
  difficulty             text check (difficulty in ('easy','normal','bold')),                -- bold = 「少し前進」
  status                 text not null check (status in ('started','done','abandoned')),
  memo_text              text,
  selected_value         text,                                                               -- choice_done の選択値
  ai_session_id          uuid,                                                               -- ai_assist の場合、ai_sessions.session_id
  reaction               text check (reaction in ('better','same','hard')),                  -- 行動後の体感（少し楽/変わらない/むずかしかった）
  started_at             timestamptz not null default now(),
  completed_at           timestamptz,
  app_version            text not null,
  platform               text not null
);

create index idx_action_user_started on public.action_log(user_id, started_at desc);
create index idx_action_status       on public.action_log(status, started_at desc);
create index idx_action_exec_type    on public.action_log(action_execution_type, status);

comment on table public.action_log is '行動実行ログ。started→done/abandoned の2段階で記録。reactionは完了後別タイミングで更新される可能性あり';


-- ------------------------------------------------------------
-- app_events: 汎用イベントログ（モニタリング・デバッグ用）
--   画面遷移、ボタンクリック、エラー、その他何でもここに流し込む
--   KPI集計は specific tables（上記）、運用監視は app_events で分担
-- ------------------------------------------------------------
create table public.app_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(user_id) on delete cascade,
  session_id   uuid references public.sessions(session_id) on delete set null,
  event_type   text not null,         -- 'screen_view' / 'button_click' / 'error' / 'app_open' / 'consent_given' など
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  app_version  text not null,
  platform     text not null
);

create index idx_events_user_created on public.app_events(user_id, created_at desc);
create index idx_events_type_created on public.app_events(event_type, created_at desc);
create index idx_events_session      on public.app_events(session_id, created_at);

comment on table public.app_events is '汎用イベントログ。画面遷移・ボタン操作・エラー等をすべて受け入れる。event_type で種別、payload で詳細を保持';


-- ============================================================
-- Priority B: 追加ログ（Phase 5 で有効化）
-- 必要になった時点で下のブロックを実行
-- ============================================================

-- ------------------------------------------------------------
-- ai_sessions: AI会話セッション
-- ------------------------------------------------------------
create table public.ai_sessions (
  session_id     uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(user_id) on delete cascade,
  app_session_id uuid references public.sessions(session_id) on delete set null,
  purpose        text,                                                 -- 'reflect' / 'chat' など
  message_count  int  not null default 0,
  ended_reason   text,                                                 -- 'user_close' / 'timeout' / 'error' など
  created_at     timestamptz not null default now(),
  ended_at       timestamptz,
  app_version    text not null,
  platform       text not null
);

create index idx_ai_user_created on public.ai_sessions(user_id, created_at desc);


-- ------------------------------------------------------------
-- recommendation_feedback: 行動提案の適合度
-- ------------------------------------------------------------
create table public.recommendation_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(user_id) on delete cascade,
  session_id   uuid references public.sessions(session_id) on delete set null,
  action_id    text not null,
  fit_score    text not null check (fit_score in ('fit','so-so','not-fit')),   -- 合っていた/まあまあ/合っていない
  created_at   timestamptz not null default now(),
  app_version  text not null,
  platform     text not null
);

create index idx_recfb_user_created on public.recommendation_feedback(user_id, created_at desc);


-- ============================================================
-- RLS (Row Level Security)
-- β段階の方針:
--   anon（ブラウザから叩くクライアント）には INSERT と限定的な UPDATE のみ許可
--   SELECT は service_role のみ → Supabase Dashboard から SQL で閲覧
--   これにより「他人のデータは見えない」「ログは書ける」を両立
-- ============================================================

alter table public.users                   enable row level security;
alter table public.sessions                enable row level security;
alter table public.emotion_log             enable row level security;
alter table public.action_log              enable row level security;
alter table public.app_events              enable row level security;
alter table public.ai_sessions             enable row level security;
alter table public.recommendation_feedback enable row level security;

-- users
create policy anon_insert_users on public.users
  for insert to anon with check (true);

-- sessions: INSERT / ended_at・mood_after 更新のため UPDATE も許可
create policy anon_insert_sessions on public.sessions
  for insert to anon with check (true);
create policy anon_update_sessions on public.sessions
  for update to anon using (true) with check (true);

-- emotion_log
create policy anon_insert_emotion on public.emotion_log
  for insert to anon with check (true);

-- action_log: status='started' → 'done' の更新があるため UPDATE 許可
create policy anon_insert_action on public.action_log
  for insert to anon with check (true);
create policy anon_update_action on public.action_log
  for update to anon using (true) with check (true);

-- app_events（INSERT only：汎用ログは更新しない）
create policy anon_insert_events on public.app_events
  for insert to anon with check (true);

-- ai_sessions
create policy anon_insert_ai on public.ai_sessions
  for insert to anon with check (true);
create policy anon_update_ai on public.ai_sessions
  for update to anon using (true) with check (true);

-- recommendation_feedback
create policy anon_insert_recfb on public.recommendation_feedback
  for insert to anon with check (true);


-- ============================================================
-- KPI計算用ビュー（Dashboard 用クエリのベース）
-- ============================================================

-- 週次の行動実行ユーザー（North Star 分子）
create or replace view public.v_weekly_action_users as
select
  date_trunc('week', completed_at) as week_start,
  count(distinct user_id)          as users_with_done_action
from public.action_log
where status = 'done'
group by 1
order by 1 desc;

-- 週次アクティブユーザー（任意のログ1件以上）
create or replace view public.v_weekly_active_users as
with all_events as (
  select user_id, started_at as ts from public.sessions
  union all
  select user_id, recorded_at    from public.emotion_log
  union all
  select user_id, started_at     from public.action_log
)
select
  date_trunc('week', ts) as week_start,
  count(distinct user_id) as active_users
from all_events
group by 1
order by 1 desc;

-- 行動タイプ別 表示数→完了数（実行率）
create or replace view public.v_action_type_conversion as
select
  action_execution_type,
  count(*) filter (where status in ('started','done','abandoned')) as attempts,
  count(*) filter (where status = 'done')                          as dones,
  round(
    100.0 * count(*) filter (where status = 'done')
    / nullif(count(*) filter (where status in ('started','done','abandoned')), 0),
    1
  ) as done_rate_pct
from public.action_log
group by 1
order by 1;

-- difficulty別 実行率
create or replace view public.v_difficulty_conversion as
select
  difficulty,
  count(*) filter (where status in ('started','done','abandoned')) as attempts,
  count(*) filter (where status = 'done')                          as dones,
  round(
    100.0 * count(*) filter (where status = 'done')
    / nullif(count(*) filter (where status in ('started','done','abandoned')), 0),
    1
  ) as done_rate_pct
from public.action_log
where difficulty is not null
group by 1
order by case difficulty when 'easy' then 1 when 'normal' then 2 when 'bold' then 3 end;

-- セッション前後の気分変化
create or replace view public.v_session_mood_delta as
select
  user_id,
  session_id,
  started_at,
  mood_before,
  mood_after,
  (mood_after - mood_before) as mood_delta
from public.sessions
where mood_before is not null and mood_after is not null
order by started_at desc;

-- D1 / D7 Retention 計算用（簡易版：初回接触日を基準に N日後の再訪）
create or replace view public.v_user_first_seen as
select user_id, min(started_at) as first_seen_at
from public.sessions
group by 1;


-- ============================================================
-- モニタリング用ビュー（運用・デバッグ用）
-- ============================================================

-- 1ユーザーの全イベント時系列（デバッグの主役）
--   使い方: select * from v_user_journey where user_id = '...' order by occurred_at desc limit 100;
create or replace view public.v_user_journey as
  select user_id, session_id, started_at as occurred_at, 'session_start'::text as event,
         jsonb_build_object('entry_point', entry_point, 'mood_before', mood_before, 'platform', platform) as details,
         app_version
    from public.sessions
  union all
  select user_id, session_id, ended_at, 'session_end',
         jsonb_build_object('mood_after', mood_after),
         app_version
    from public.sessions where ended_at is not null
  union all
  select user_id, session_id, recorded_at, 'emotion_check',
         jsonb_build_object('emotion_level', emotion_level, 'note', note),
         app_version
    from public.emotion_log
  union all
  select user_id, session_id, started_at, 'action_start',
         jsonb_build_object('action_id', action_id, 'type', action_execution_type, 'difficulty', difficulty),
         app_version
    from public.action_log
  union all
  select user_id, session_id, completed_at, ('action_' || status)::text,
         jsonb_build_object('action_id', action_id, 'reaction', reaction, 'memo', memo_text),
         app_version
    from public.action_log where completed_at is not null
  union all
  select user_id, session_id, created_at, event_type,
         payload,
         app_version
    from public.app_events;

-- 日次アクティブユーザー（DAU）
create or replace view public.v_daily_active_users as
with all_events as (
  select user_id, date_trunc('day', started_at) as day from public.sessions
  union
  select user_id, date_trunc('day', recorded_at) from public.emotion_log
  union
  select user_id, date_trunc('day', started_at) from public.action_log
  union
  select user_id, date_trunc('day', created_at) from public.app_events
)
select day, count(distinct user_id) as active_users
from all_events
group by 1
order by 1 desc;

-- エラー一覧（app_events から event_type='error' を抽出）
create or replace view public.v_error_events as
select
  id,
  user_id,
  session_id,
  created_at,
  payload->>'message' as error_message,
  payload->>'stack'   as error_stack,
  payload->>'screen'  as screen,
  payload->>'url'     as url,
  app_version,
  platform
from public.app_events
where event_type = 'error'
order by created_at desc;


-- ============================================================
-- 動作確認用クエリ（コメントアウトで残す）
-- ============================================================
-- select * from public.v_weekly_action_users;
-- select * from public.v_weekly_active_users;
-- select * from public.v_action_type_conversion;
-- select * from public.v_difficulty_conversion;
-- select * from public.v_session_mood_delta limit 20;
