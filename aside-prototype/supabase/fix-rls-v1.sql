-- ============================================================
-- RLSポリシー修正: to anon → to public
--
-- 背景:
--   Supabase 新形式publishable key (sb_publishable_...) が
--   従来の "to anon" ポリシーにマッチしないケースで42501が出る。
--   to public にすることで全ロールに適用され、確実に動作する。
--
-- 適用方法: Supabase Dashboard > SQL Editor に貼り付けて Run
-- ============================================================

-- 既存の anon ポリシーを削除
drop policy if exists anon_insert_users                   on public.users;
drop policy if exists anon_insert_sessions                on public.sessions;
drop policy if exists anon_update_sessions                on public.sessions;
drop policy if exists anon_insert_emotion                 on public.emotion_log;
drop policy if exists anon_insert_action                  on public.action_log;
drop policy if exists anon_update_action                  on public.action_log;
drop policy if exists anon_insert_events                  on public.app_events;
drop policy if exists anon_insert_ai                      on public.ai_sessions;
drop policy if exists anon_update_ai                      on public.ai_sessions;
drop policy if exists anon_insert_recfb                   on public.recommendation_feedback;

-- to public で再作成（INSERT）
create policy insert_users     on public.users                   for insert to public with check (true);
create policy insert_sessions  on public.sessions                for insert to public with check (true);
create policy insert_emotion   on public.emotion_log             for insert to public with check (true);
create policy insert_action    on public.action_log              for insert to public with check (true);
create policy insert_events    on public.app_events              for insert to public with check (true);
create policy insert_ai        on public.ai_sessions             for insert to public with check (true);
create policy insert_recfb     on public.recommendation_feedback for insert to public with check (true);

-- to public で再作成（UPDATE）
create policy update_sessions  on public.sessions                for update to public using (true) with check (true);
create policy update_action    on public.action_log              for update to public using (true) with check (true);
create policy update_ai        on public.ai_sessions             for update to public using (true) with check (true);

-- users テーブルに consent_at を埋めるための UPDATE も必要
create policy update_users     on public.users                   for update to public using (true) with check (true);

-- 確認
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
