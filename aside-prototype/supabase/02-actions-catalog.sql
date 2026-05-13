-- ============================================================
-- もやの森 β版 / 行動カタログテーブル  v1.0
-- 対象: いっぽの「行動カタログ（ACTIONS）」管理
-- 作成: 2026-05-13
--
-- 役割:
--   旧 Google Sheets 公開CSV 運用を廃し、Supabaseテーブルで管理する。
--   anon (アプリブラウザ) は is_active=true の行のみ SELECT 可能。
--   編集は Supabase Studio (Table Editor) から service_role で実施。
--
-- 適用方法: Supabase Dashboard > SQL Editor に貼り付けて実行
--   既に schema.sql 適用済プロジェクトに追加で実行する想定。
-- ============================================================


-- ------------------------------------------------------------
-- actions: いっぽの行動カタログ（50件マスタ）
-- ------------------------------------------------------------
create table public.actions (
  id           text primary key,                                                   -- 'A001' 等。半角英数
  cat          text not null check (cat in ('physical','cognitive','relax','assertion')),
  icon         text,                                                               -- 絵文字1〜2文字（任意）
  title        text not null,
  description  text not null,                                                      -- アプリ表示用説明文
  time_label   text not null,                                                      -- '5分' '5-10分' 等。表示用文字列
  technique    text not null,                                                      -- '行動活性化' 等
  domains      text not null,                                                      -- パイプ区切り 例: 'work|self|sleep'
  is_active    boolean not null default true,                                      -- false にすると anon に見えない（ドラフト保存）
  updated_at   timestamptz not null default now()
);

comment on table public.actions is 'いっぽの行動カタログマスタ。Supabase Studio から直接編集する運用';

-- updated_at を自動更新
create or replace function public.set_actions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_actions_updated_at
  before update on public.actions
  for each row execute function public.set_actions_updated_at();


-- ------------------------------------------------------------
-- RLS: anon は is_active=true のみ SELECT。書き込みは service_role のみ
-- ------------------------------------------------------------
alter table public.actions enable row level security;

create policy anon_select_active_actions on public.actions
  for select to anon using (is_active = true);


-- ------------------------------------------------------------
-- シードデータ (50件) — 既存バンドル ACTIONS と同等
-- ------------------------------------------------------------
insert into public.actions (id, cat, icon, title, description, time_label, technique, domains) values
  ('A001', 'physical', '🚶', '5分だけ散歩', '玄関を出て5分歩く。家の周りでもOK。', '5分', '行動活性化', 'work|self|sleep'),
  ('A002', 'physical', '🌬', '深呼吸4-7-8', '4秒吸って7秒止めて8秒吐く。これを3回。', '1分', 'リラクセーション', 'work|sleep|self|relationship'),
  ('A003', 'physical', '💧', '冷たい水を顔に', '30秒間、冷水で顔を洗う。一気にスッキリする。', '1分', '行動活性化', 'sleep|self'),
  ('A004', 'physical', '🌿', 'ストレッチ3分', '肩・首・背中を伸ばす。立っても座っててもOK。', '3分', 'リラクセーション', 'sleep|work'),
  ('A005', 'physical', '☕', '温かい飲み物', '白湯やハーブティーをゆっくり一口ずつ。', '5分', 'マインドフルネス', 'self|sleep'),
  ('A006', 'physical', '🌅', '日光15分', '朝の光を浴びる。窓辺やベランダでもOK。', '15分', '行動活性化', 'sleep|self'),
  ('A007', 'physical', '🧹', '1ヶ所だけ片付ける', '机の上、ベッド周り、玄関など1ヶ所だけ。', '5-10分', '行動活性化', 'self|work'),
  ('A008', 'physical', '🌱', '植物の世話', '水やりや葉拭き。観葉植物の動画でも。', '3分', 'マインドフルネス', 'self'),
  ('A009', 'physical', '🎵', '好きな音楽1曲', '1曲だけ集中して聴く。歌詞や音に意識を。', '3-5分', '行動活性化', 'self|work'),
  ('A010', 'physical', '🛁', 'お風呂5分', '湯船に5分だけ。シャワーの日は足湯でも。', '5分', 'リラクセーション', 'sleep|self'),
  ('A011', 'physical', '🍳', '簡単な料理1品', '冷凍食品やレンジ調理でOK。1品作る達成感。', '10-15分', '行動活性化', 'self'),
  ('A012', 'physical', '📝', '頭の中を紙に書き出す', 'モヤモヤを5分で書く。単語の羅列でOK。', '5分', '認知の外在化', 'work|relationship|self'),
  ('A013', 'physical', '💪', '肩をストン', '肩をぐっと上げて10秒、ストンと落とす。3回。', '1分', 'リラクセーション', 'sleep|work'),
  ('A014', 'physical', '🌸', '好きな香り', 'アロマやコーヒー、好きな石鹸の香りを意識して。', '1分', 'マインドフルネス', 'self|sleep'),
  ('A015', 'physical', '📷', '今日の風景を1枚', 'スマホで今いる場所を1枚撮る。何でもOK。', '1分', '行動活性化', 'self'),
  ('A016', 'cognitive', '👀', '別の見方を3つ書く', '同じ状況を他の人ならどう見るか3パターン。', '5分', '認知再構成', 'work|relationship|self'),
  ('A017', 'cognitive', '✨', '良かったこと3つ', '今日「ちょっと良かった」を3つ。小さなことでOK。', '3分', '認知再構成', 'self'),
  ('A018', 'cognitive', '🔍', '事実と解釈を分ける', '起きた事実 / 私の解釈 / 別の解釈を3行で。', '3分', '認知再構成', 'relationship|work'),
  ('A019', 'cognitive', '⬇️', 'なぜそう思う？を3回', '「私はダメ」と思う理由をなぜなぜで3層深掘り。', '5分', '下向き矢印法', 'self|work'),
  ('A020', 'cognitive', '🌈', '過去の成功を1つ', '過去に上手くいった経験を1つ思い出して書く。', '3分', '認知再構成', 'self|work|future'),
  ('A021', 'cognitive', '🎯', '今日のホット', '今日一番引っかかった瞬間を1つだけ書く。', '3分', 'ホット思考特定', 'work|relationship|self'),
  ('A022', 'cognitive', '💌', '自分への手紙', '友達が同じ悩みなら何て言うか、自分宛に書く。', '5分', '認知再構成', 'self|work'),
  ('A023', 'cognitive', '🔄', '「すべき」を「したい」に', '「○○すべき」を「○○したい」に書き換える。', '3分', '認知再構成', 'work|self'),
  ('A024', 'cognitive', '🔮', '未来を確かめる', '「絶対上手くいかない」の根拠を書き出す。', '3分', '認知再構成', 'future|self'),
  ('A025', 'cognitive', '🎨', 'グラデーションで見る', '「100%でないなら0」を50%・70%・90%で見直す。', '3分', '認知再構成', 'self|work'),
  ('A026', 'cognitive', '⚖️', '責任を分配する', 'その出来事の責任を関係者で割合分けしてみる。', '3分', '認知再構成', 'relationship|work'),
  ('A027', 'cognitive', '🤔', '「嫌い」の根拠', '「相手は私を嫌い」の根拠を3つ書いてみる。', '3分', '認知再構成', 'relationship'),
  ('A028', 'cognitive', '🧪', '小さな実験', '「もし○○したら○○になる」って仮説を1つ立てる。', '3分', '行動実験', 'relationship|work|self'),
  ('A029', 'cognitive', '🏷', '感情に名前をつける', '今の感情を3つの単語で表現する。', '1分', '感情ラベリング', 'self'),
  ('A030', 'cognitive', '💬', '「私は」で言い換える', '「あなたが○○」を「私は○○と感じる」に。', '3分', 'アサーション準備', 'relationship|work'),
  ('A031', 'relax', '🌬', '呼吸瞑想3分', '呼吸に注意を向ける。雑念が湧いても戻ればOK。', '3分', 'マインドフルネス', 'sleep|self'),
  ('A032', 'relax', '🫀', '身体スキャン', '頭から足まで、順番に注意を向けていく。', '5分', 'マインドフルネス', 'sleep|self'),
  ('A033', 'relax', '👀', '5-4-3-2-1', '見える物5、音4、触れる物3、匂い2、味1。', '3分', 'マインドフルネス', 'self|sleep'),
  ('A034', 'relax', '👂', '1分聴く', '1分間、聞こえる音だけに集中する。', '1分', 'マインドフルネス', 'self'),
  ('A035', 'relax', '🍵', '一口だけ味わう', 'お茶やお菓子を、1口だけ意識して味わう。', '1分', 'マインドフルネス', 'self'),
  ('A036', 'relax', '💝', 'やさしさの言葉', '「私が幸せでありますように」を3回、心の中で。', '1分', 'マインドフルネス', 'self'),
  ('A037', 'relax', '🌳', '自然画像を見る', '自然の写真や動画を1分眺める。', '1分', 'リラクセーション', 'self|sleep'),
  ('A038', 'relax', '🧘', '体を伸ばす5分', 'ヨガ的な軽いストレッチ。動画見ながらでも。', '5分', 'リラクセーション', 'sleep|self'),
  ('A039', 'relax', '🔢', '呼吸を数える', '吸う「1」、吐く「2」と数える。10まで。', '2分', 'マインドフルネス', 'sleep|self'),
  ('A040', 'relax', '📍', '今、ここ', '「いま私は○○している」と独り言で実況中継。', '1分', 'マインドフルネス', 'self'),
  ('A041', 'assertion', '🗣', '断りたいことを書く', '今、断りたいこと1つ書いて言い換える。', '3分', 'アサーション', 'relationship|work'),
  ('A042', 'assertion', '✋', '小さな要望を1つ', '今日中に小さな要望を1つ伝えてみる。', '5分', 'アサーション', 'relationship|work'),
  ('A043', 'assertion', '📝', 'お願いのフレーズ', '「お願いがあって…」のパターンを3つ用意。', '3分', 'アサーション準備', 'relationship|work'),
  ('A044', 'assertion', '❌', 'NOの理由を1行', '「NO」と言いたい理由を1行で言葉にする。', '2分', 'アサーション準備', 'relationship|work'),
  ('A045', 'assertion', '💬', '私メッセージ', '「私は○○と感じる、だから○○してほしい」。', '3分', 'アサーション', 'relationship|work'),
  ('A046', 'assertion', '🌫', 'グレーゾーンで返す', '白黒で答える前に「○○でも△△でもいい」を考える。', '3分', 'アサーション', 'relationship'),
  ('A047', 'assertion', '👥', '相手の立場を1分想像', '相手の視点で、同じ状況を1分想像してみる。', '1分', 'アサーション準備', 'relationship'),
  ('A048', 'assertion', '🙏', '感謝もセットに', '「断る」+「いつもありがとう」をセットで言う。', '3分', 'アサーション', 'relationship|work'),
  ('A049', 'assertion', '⏳', '即答を避ける', '「ちょっと考えさせて」と言うパターン。', '1分', 'アサーション', 'relationship|work'),
  ('A050', 'assertion', '📅', '明日の準備', '明日「断りたい場面」を3行で書いておく。', '3分', 'アサーション計画', 'relationship|work')
on conflict (id) do nothing;


-- ============================================================
-- 動作確認
-- ============================================================
-- select count(*) from public.actions;        -- 50
-- select cat, count(*) from public.actions group by cat order by cat;
-- select * from public.actions order by id limit 5;
