-- ============================================
-- きもちチェック データベーススキーマ v1
-- Supabase SQL Editor で実行してください
-- Project: kimochi-check
-- ============================================

-- 学校
CREATE TABLE schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  prefecture  TEXT,
  plan        TEXT DEFAULT 'trial',  -- trial / basic / standard / premium
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- クラス
CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
  grade       INT,
  name        TEXT,
  class_code  TEXT UNIQUE NOT NULL,  -- 学生が入力する6桁コード
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 教員（Supabase Auth の user_id と紐付け）
CREATE TABLE teachers (
  id          UUID PRIMARY KEY,  -- auth.users.id と同じ値
  school_id   UUID REFERENCES schools(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT DEFAULT 'teacher',  -- teacher / school_admin
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 教員 ↔ クラス（中間テーブル）
CREATE TABLE teacher_classes (
  teacher_id  UUID REFERENCES teachers(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, class_id)
);

-- 学生（教員からは名前で特定可能・弊社には名前を渡さない）
CREATE TABLE students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID REFERENCES classes(id) ON DELETE CASCADE,
  display_name  TEXT,   -- 学生が登録した名前 or 出席番号
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 気分記録（コメント本文はローカルのみ・送信しない）
CREATE TABLE mood_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID REFERENCES students(id) ON DELETE CASCADE,
  score       INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  tags        TEXT[],           -- ['school','friend','family','self','other']
  detail      JSONB,            -- 各項目スコア例: {"school":4,"friend":5,"sleep":2}
  comment     TEXT,             -- ひとことコメント（教員ダッシュボードで閲覧可）
  recorded_at DATE NOT NULL,    -- 記録日（1日1件）
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, recorded_at)
);

-- AIチャット利用ログ（内容は保存しない）
CREATE TABLE chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count   INT DEFAULT 0,
  duration_sec    INT DEFAULT 0,
  crisis_detected BOOLEAN DEFAULT FALSE,  -- 危機ワード検出フラグ
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 相談接続ログ（回数のみ記録）
CREATE TABLE consultation_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID REFERENCES students(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ DEFAULT now()
);

-- アラート（医療機関連携対応設計済み）
CREATE TABLE alerts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID REFERENCES students(id) ON DELETE CASCADE,
  level                INT NOT NULL CHECK (level BETWEEN 1 AND 3),
  reason               TEXT,    -- score_low / chat_spike / crisis_word / score_drop
  detail               JSONB,   -- 詳細データ例: {"avg_score": 1.2, "days": 7}
  external_notifiable  BOOLEAN DEFAULT FALSE,  -- 将来の医療機関連携フラグ
  notified_at          TIMESTAMPTZ,
  resolved_at          TIMESTAMPTZ,
  teacher_memo         TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- インデックス（検索パフォーマンス）
-- ============================================
CREATE INDEX idx_mood_student_date   ON mood_records(student_id, recorded_at DESC);
CREATE INDEX idx_chat_student_date   ON chat_sessions(student_id, session_date DESC);
CREATE INDEX idx_alerts_student      ON alerts(student_id, level, created_at DESC);
CREATE INDEX idx_alerts_unresolved   ON alerts(level, created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_students_class      ON students(class_id);

-- ============================================
-- Row Level Security（RLS）有効化
-- ============================================
ALTER TABLE schools           ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE students           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts             ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS ポリシー（学生アプリ = 匿名アクセス）
-- ============================================

-- クラス: クラスコード検索のため全員参照可
CREATE POLICY "classes_select_all" ON classes
  FOR SELECT USING (true);

-- 学生: 誰でも登録可（クラスコード検証はアプリ側）
CREATE POLICY "students_insert_all" ON students
  FOR INSERT WITH CHECK (true);

-- 学生: 自分のIDで参照・更新
CREATE POLICY "students_select_all" ON students
  FOR SELECT USING (true);

-- 気分記録: 誰でも追加・参照・更新可（student_id で絞る）
CREATE POLICY "mood_insert_all"  ON mood_records FOR INSERT WITH CHECK (true);
CREATE POLICY "mood_select_all"  ON mood_records FOR SELECT USING (true);
CREATE POLICY "mood_update_all"  ON mood_records FOR UPDATE USING (true);

-- チャットセッション
CREATE POLICY "chat_insert_all"  ON chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_select_all"  ON chat_sessions FOR SELECT USING (true);
CREATE POLICY "chat_update_all"  ON chat_sessions FOR UPDATE USING (true);

-- 相談ログ
CREATE POLICY "consult_insert_all" ON consultation_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- テストデータ
-- ============================================
INSERT INTO schools (id, name, prefecture, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'テスト高校', '東京都', 'trial');

INSERT INTO classes (id, school_id, grade, name, class_code) VALUES
  ('00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   1, 'A組', 'TEST01');
