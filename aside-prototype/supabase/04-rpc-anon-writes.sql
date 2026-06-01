-- ============================================================
-- 04-rpc-anon-writes.sql — anon の UPDATE 系ログを RPC 経由に置き換え
-- 適用先: Supabase `aside-beta`
-- 実行方法: Supabase Dashboard > SQL Editor にコピペして RUN → 最後に schema reload
--
-- 背景: users/sessions/action_log は anon に SELECT ポリシーが無いため、
--   anon の「UPDATE ... WHERE id=X」は対象行を読めず 0 行更新（=保存されない）。
--   SELECT を開けると外部にログが読めてしまうので、代わりに SECURITY DEFINER 関数
--   （所有者=postgres 権限で RLS バイパス・指定 1 行だけ更新）を anon に実行許可する。
--   これでテーブルは外から読めないまま、必要な更新だけ通る。
-- ============================================================

-- ① プロフィール（ニックネーム/立場/年代/性別）
create or replace function public.set_user_profile(
  p_user_id    uuid,
  p_nickname   text default null,
  p_occupation text default null,
  p_age_range  text default null,
  p_gender     text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set nickname   = coalesce(p_nickname,   nickname),
         occupation = coalesce(p_occupation, occupation),
         age_range  = coalesce(p_age_range,  age_range),
         gender     = coalesce(p_gender,     gender)
   where user_id = p_user_id;
end; $$;

-- ② 同意日時の記録
create or replace function public.record_consent(
  p_user_id         uuid,
  p_consent_version text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set consent_at      = now(),
         consent_version = p_consent_version
   where user_id = p_user_id;
end; $$;

-- ③ セッション終了（ended_at + mood_after）
create or replace function public.end_session(
  p_session_id uuid,
  p_mood_after int default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.sessions
     set ended_at   = now(),
         mood_after = coalesce(p_mood_after::smallint, mood_after)
   where session_id = p_session_id;
end; $$;

-- ④ セッション前後の気分（mood_before / mood_after を後から埋める）
create or replace function public.set_session_mood(
  p_session_id  uuid,
  p_mood_before int default null,
  p_mood_after  int default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.sessions
     set mood_before = coalesce(p_mood_before::smallint, mood_before),
         mood_after  = coalesce(p_mood_after::smallint,  mood_after)
   where session_id = p_session_id;
end; $$;

-- ⑤ 行動の完了/放棄（★North Star KPI★ status=done を記録）
create or replace function public.complete_action(
  p_id             uuid,
  p_status         text default 'done',
  p_memo_text      text default null,
  p_selected_value text default null,
  p_ai_session_id  uuid default null,
  p_reaction       text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.action_log
     set status         = coalesce(p_status, status),
         memo_text      = coalesce(p_memo_text, memo_text),
         selected_value = coalesce(p_selected_value, selected_value),
         ai_session_id  = coalesce(p_ai_session_id, ai_session_id),
         reaction       = coalesce(p_reaction, reaction),
         completed_at   = now()
   where id = p_id;
end; $$;

-- ⑥ 行動後リアクション（完了後、別画面で取得する場合）
create or replace function public.set_action_reaction(
  p_id       uuid,
  p_reaction text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.action_log
     set reaction = p_reaction
   where id = p_id;
end; $$;

-- ----- 実行権限: public 一般から剥がし、anon にだけ EXECUTE を許可 -----
revoke all on function public.set_user_profile(uuid,text,text,text,text)       from public;
revoke all on function public.record_consent(uuid,text)                        from public;
revoke all on function public.end_session(uuid,int)                            from public;
revoke all on function public.set_session_mood(uuid,int,int)                   from public;
revoke all on function public.complete_action(uuid,text,text,text,uuid,text)   from public;
revoke all on function public.set_action_reaction(uuid,text)                   from public;

grant execute on function public.set_user_profile(uuid,text,text,text,text)     to anon;
grant execute on function public.record_consent(uuid,text)                      to anon;
grant execute on function public.end_session(uuid,int)                          to anon;
grant execute on function public.set_session_mood(uuid,int,int)                 to anon;
grant execute on function public.complete_action(uuid,text,text,text,uuid,text) to anon;
grant execute on function public.set_action_reaction(uuid,text)                 to anon;

-- PostgREST にスキーマ再読込を通知（新規関数を即時露出）
notify pgrst, 'reload schema';
