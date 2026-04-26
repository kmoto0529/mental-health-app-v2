# モニタリング・クエリ集

**対象**: Aside β版
**前提**: Supabase Dashboard > SQL Editor で実行
**schema**: [supabase/schema.sql](../supabase/schema.sql) v1.0 適用済み

各クエリはSupabaseのSQL Editorにコピペで実行できます。よく使うものは **Save query** で名前を付けて保存推奨。

---

## 🔥 日々の確認ルーティン（まずこれを見る）

### Q1. 今日アプリを触った人の一覧

```sql
select
  u.user_id,
  u.first_seen_platform,
  max(s.started_at) as last_opened_at,
  count(distinct s.session_id) as sessions_today
from public.users u
join public.sessions s on s.user_id = u.user_id
where s.started_at::date = current_date
group by u.user_id, u.first_seen_platform
order by last_opened_at desc;
```

### Q2. 今週の行動実行率（North Star KPI）

```sql
with weekly_active as (
  select user_id from public.v_daily_active_users
  where day >= date_trunc('week', current_date)
),
weekly_done as (
  select distinct user_id from public.action_log
  where status = 'done' and completed_at >= date_trunc('week', current_date)
)
select
  (select count(distinct user_id) from weekly_active) as active_users,
  (select count(*) from weekly_done) as users_with_done_action,
  round(
    100.0 * (select count(*) from weekly_done)
    / nullif((select count(distinct user_id) from weekly_active), 0),
    1
  ) as action_rate_pct;
-- 目標: 50%以上
```

### Q3. エラー発生状況（直近24時間）

```sql
select *
from public.v_error_events
where created_at >= now() - interval '24 hours'
order by created_at desc;
```

---

## 👤 特定ユーザーを深掘り

### Q4. ユーザーXの最新100イベントを時系列で

```sql
-- user_id は Q1 でコピーしたIDに差し替え
select occurred_at, event, details, session_id
from public.v_user_journey
where user_id = 'ここにUUIDを貼る'
order by occurred_at desc
limit 100;
```

### Q5. ユーザーXのmood推移（グラフ用）

```sql
select date(recorded_at) as day,
       emotion_level,
       note
from public.emotion_log
where user_id = 'ここにUUIDを貼る'
order by recorded_at;
```

### Q6. ユーザーXの行動達成記録

```sql
select
  started_at,
  action_id,
  action_execution_type,
  difficulty,
  status,
  reaction,
  memo_text
from public.action_log
where user_id = 'ここにUUIDを貼る'
order by started_at desc;
```

---

## 📊 KPI集計

### Q7. 週次の行動タイプ別実行率（§6-1）

```sql
select
  date_trunc('week', started_at) as week_start,
  action_execution_type,
  count(*) filter (where status = 'done') as dones,
  count(*) as attempts,
  round(100.0 * count(*) filter (where status = 'done') / nullif(count(*), 0), 1) as done_rate_pct
from public.action_log
group by 1, 2
order by 1 desc, 2;
```

### Q8. difficulty別実行率（§6-2）

```sql
select * from public.v_difficulty_conversion;
-- easy / normal / bold（少し前進）の実行率が見える
```

### Q9. D1・D7 Retention（§4-1）

```sql
with fs as (
  select user_id, first_seen_at::date as d0 from public.v_user_first_seen
),
dau as (
  select distinct user_id, day::date as active_day from public.v_daily_active_users
)
select
  fs.d0 as cohort_date,
  count(distinct fs.user_id) as cohort_size,
  count(distinct case when dau.active_day = fs.d0 + 1 then fs.user_id end) as d1_retained,
  count(distinct case when dau.active_day = fs.d0 + 7 then fs.user_id end) as d7_retained,
  round(100.0 * count(distinct case when dau.active_day = fs.d0 + 1 then fs.user_id end) / nullif(count(distinct fs.user_id), 0), 1) as d1_pct,
  round(100.0 * count(distinct case when dau.active_day = fs.d0 + 7 then fs.user_id end) / nullif(count(distinct fs.user_id), 0), 1) as d7_pct
from fs
left join dau on dau.user_id = fs.user_id
group by fs.d0
order by fs.d0 desc;
-- 目標: D1=70%以上 / D7=40%以上
```

### Q10. Activation: 初回セッションで行動した割合（§4-2）

```sql
with first_session as (
  select distinct on (user_id) user_id, session_id, started_at
  from public.sessions
  order by user_id, started_at
)
select
  count(distinct fs.user_id) as new_users,
  count(distinct case when al.user_id is not null then fs.user_id end) as activated,
  round(100.0 * count(distinct case when al.user_id is not null then fs.user_id end)
        / nullif(count(distinct fs.user_id), 0), 1) as activation_rate_pct
from first_session fs
left join public.action_log al
  on al.session_id = fs.session_id
 and al.status in ('started','done');
-- 目標: 60%以上
```

### Q11. セッション前後の気分変化（§7-2）

```sql
select
  mood_before,
  mood_after,
  count(*) as sessions,
  round(avg(mood_after - mood_before)::numeric, 2) as avg_delta
from public.sessions
where mood_before is not null and mood_after is not null
group by 1, 2
order by 1, 2;
-- avg_delta > 0 ならセッション後に気分が上がっている
```

### Q12. 行動後リアクションの分布（§5-1）

```sql
select
  reaction,
  count(*) as cnt,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from public.action_log
where reaction is not null
group by 1
order by 2 desc;
-- better（少し楽）の比率が成功指標。目標: 30%以上
```

---

## 🔍 詰まりポイント発見

### Q13. どの画面で離脱しているか（セッション最後の画面）

```sql
with last_screen as (
  select distinct on (session_id)
    session_id, user_id, payload->>'screen' as screen, created_at
  from public.app_events
  where event_type = 'screen_view'
  order by session_id, created_at desc
)
select
  screen,
  count(*) as exit_count
from last_screen
where screen is not null
group by 1
order by 2 desc;
```

### Q14. 画面別の平均滞在セッション数

```sql
select
  payload->>'screen' as screen,
  count(*) as view_count,
  count(distinct user_id) as unique_users
from public.app_events
where event_type = 'screen_view'
group by 1
order by 2 desc;
```

### Q15. 行動を開始したが完了しなかったケース

```sql
select
  user_id,
  action_id,
  action_execution_type,
  started_at,
  status
from public.action_log
where status in ('started','abandoned')
  and completed_at is null
  and started_at < now() - interval '1 hour'
order by started_at desc;
-- 1時間経っても status='started' のまま = 放棄の可能性大
```

---

## 🧠 AI会話モニタ（Phase 5 以降）

### Q16. AI会話を使った人とその反応

```sql
select
  ai.user_id,
  ai.session_id,
  ai.purpose,
  ai.message_count,
  ai.ended_reason,
  ai.created_at
from public.ai_sessions ai
order by ai.created_at desc
limit 50;
```

---

## ✅ β参加者全体スナップショット（週次レビュー用）

```sql
select
  (select count(*) from public.users) as total_users,
  (select count(*) from public.users where consent_at is not null) as consented,
  (select count(distinct user_id) from public.sessions where started_at >= now() - interval '7 days') as wau,
  (select count(*) from public.action_log where status = 'done' and completed_at >= now() - interval '7 days') as actions_done_7d,
  (select count(*) from public.emotion_log where recorded_at >= now() - interval '7 days') as mood_logs_7d,
  (select count(*) from public.app_events where event_type = 'error' and created_at >= now() - interval '7 days') as errors_7d;
```

---

## 📝 運用メモ

- クエリを **Save** しておくと左メニューから即呼び出せる
- `user_id` はUUIDが長いので Q1 の結果からコピペ推奨
- パフォーマンス懸念は現時点では不要（N=10-20人規模）
- 新しい欲しい指標が出てきたら、このファイルに追記して残すこと
