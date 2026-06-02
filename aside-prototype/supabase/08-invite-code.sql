-- ============================================================
-- 08-invite-code.sql — 招待コード（配布コード）を匿名IDに紐づける
-- 配布ルート（心理士/知人/コミュニティ等）別の分析用。
-- 適用: SQL Editor で RUN。
-- ============================================================

-- 1) users に列追加
alter table public.users add column if not exists invite_code text;

-- 2) 招待コード保存RPC（anonはUPDATE不可のためSECURITY DEFINER経由）
create or replace function public.set_invite_code(
  p_user_id     uuid,
  p_invite_code text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.users set invite_code = p_invite_code where user_id = p_user_id;
end; $$;

revoke all on function public.set_invite_code(uuid,text) from public;
grant execute on function public.set_invite_code(uuid,text) to anon;

-- 3) 参加者一覧ビューに「配布コード」を追加（v_customer_list を再作成）
create or replace view public.v_customer_list as
select
  coalesce(nullif(u.nickname,''),'(未設定)') as "ニックネーム",
  coalesce(nullif(u.invite_code,''),'(なし)') as "配布コード",
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

revoke all on public.v_customer_list from anon, authenticated, public;

-- 4) 配布ルート別 集計ビュー（コードごとの人数・アクティブ）
create or replace view public.v_invite_channel as
select
  coalesce(nullif(u.invite_code,''),'(なし)')          as "配布コード",
  count(*)                                             as "登録人数",
  count(*) filter (where u.consent_at is not null)     as "同意済み",
  count(distinct s.user_id)                            as "利用あり人数",
  max(s.started_at)                                    as "最終利用"
from public.users u
left join public.sessions s on s.user_id = u.user_id
group by 1
order by "登録人数" desc;

revoke all on public.v_invite_channel from anon, authenticated, public;

notify pgrst, 'reload schema';
