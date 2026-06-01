-- ============================================================
-- 03-user-profile.sql — users テーブルにプロフィール列を追加
-- 適用先: Supabase `aside-beta`（既に schema.sql v1.0 適用済みの本番）
-- 実行方法: Supabase Dashboard > SQL Editor にコピペして RUN
-- 作成: 2026-06-01（匿名IDにニックネーム/立場/年代/性別を紐づけてモニタリングするため）
-- ============================================================

-- 1) プロフィール列を追加（既存行は NULL のまま）
alter table public.users
  add column if not exists nickname   text,   -- ニックネーム（呼び名・任意）
  add column if not exists occupation text,   -- 立場: 'student' | 'worker' | 'other'
  add column if not exists age_range  text,   -- 年代: '10s'..'60plus'
  add column if not exists gender     text;   -- 性別: 'female' | 'male' | 'other' | 'no_answer'

-- 2) anon の UPDATE ポリシーを追加
--    ※ これが無いと consent_at・プロフィールの PATCH が RLS で弾かれる（従来 consent_at も未保存だった）
drop policy if exists anon_update_users on public.users;
create policy anon_update_users on public.users
  for update to anon using (true) with check (true);

-- 確認用:
-- select user_id, nickname, occupation, age_range, gender, consent_at from public.users order by created_at desc;
