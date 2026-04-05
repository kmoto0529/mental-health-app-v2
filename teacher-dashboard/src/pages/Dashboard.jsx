import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SCORE_EMOJI = { 5: '😄', 4: '🙂', 3: '😐', 2: '😟', 1: '😢' };
const LEVEL_COLOR = { 1: '#f59e0b', 2: '#ef4444', 3: '#7c3aed' };
const LEVEL_LABEL = { 1: 'Lv.1 注意', 2: 'Lv.2 警戒', 3: 'Lv.3 緊急' };
const DETAIL_LABELS = { school: '学校', friend: '友人', sleep: '睡眠' };

export default function Dashboard() {
  const [classes, setClasses]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [students, setStudents] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadClasses() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: tcData } = await supabase
        .from('teacher_classes').select('class_id').eq('teacher_id', user.id);
      const classIds = (tcData || []).map(r => r.class_id);
      if (classIds.length === 0) { setLoading(false); return; }
      const { data: clsData } = await supabase
        .from('classes').select('id, grade, name, class_code').in('id', classIds);
      setClasses(clsData || []);
      if (clsData?.length > 0) setSelected(clsData[0]);
      setLoading(false);
    }
    loadClasses();
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadClassData(selected.id);
  }, [selected]);

  async function loadClassData(classId) {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data: stuData } = await supabase
      .from('students').select('id, display_name').eq('class_id', classId).order('display_name');

    const stuIds = (stuData || []).map(s => s.id);

    // 気分記録 + detail + comment
    const { data: moodData } = await supabase
      .from('mood_records').select('student_id, score, detail, comment, recorded_at')
      .in('student_id', stuIds).gte('recorded_at', sinceStr).order('recorded_at');

    // 未解決アラート
    const { data: alertData } = await supabase
      .from('alerts').select('id, student_id, level, reason, created_at')
      .in('student_id', stuIds).is('resolved_at', null);

    const moodByStudent = {};
    (moodData || []).forEach(r => {
      if (!moodByStudent[r.student_id]) moodByStudent[r.student_id] = [];
      moodByStudent[r.student_id].push(r);
    });

    const alertByStudent = {};
    (alertData || []).forEach(a => {
      if (!alertByStudent[a.student_id]) alertByStudent[a.student_id] = [];
      alertByStudent[a.student_id].push(a);
    });

    const enriched = (stuData || []).map(s => {
      const records = moodByStudent[s.id] || [];
      const latest = records.at(-1);
      const alerts = (alertByStudent[s.id] || []).sort((a, b) => b.level - a.level);
      return {
        ...s,
        recentRecords: records,
        latestScore: latest?.score ?? null,
        latestDetail: latest?.detail ?? null,
        latestComment: latest?.comment ?? null,
        latestDate: latest?.recorded_at ?? null,
        alerts,
        maxAlertLevel: alerts.length > 0 ? Math.max(...alerts.map(a => a.level)) : 0,
      };
    });

    // アラートレベル高い順 → スコア低い順にソート
    enriched.sort((a, b) => {
      if (b.maxAlertLevel !== a.maxAlertLevel) return b.maxAlertLevel - a.maxAlertLevel;
      return (a.latestScore ?? 6) - (b.latestScore ?? 6);
    });

    setStudents(enriched);

    // クラス全体トレンド
    const dayMap = {};
    (moodData || []).forEach(r => {
      if (!dayMap[r.recorded_at]) dayMap[r.recorded_at] = [];
      dayMap[r.recorded_at].push(r.score);
    });
    setTrendData(Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, scores]) => ({
      date: date.slice(5),
      avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    })));
  }

  if (loading) return <div style={styles.loading}>読み込み中...</div>;

  const alertCount = students.filter(s => s.maxAlertLevel > 0).length;

  return (
    <div>
      {/* クラスタブ */}
      <div style={styles.tabRow}>
        {classes.map(c => (
          <button key={c.id}
            style={{ ...styles.tab, ...(selected?.id === c.id ? styles.tabActive : {}) }}
            onClick={() => setSelected(c)}
          >{c.grade}年{c.name}</button>
        ))}
      </div>

      {selected && (
        <>
          {/* サマリーカード */}
          <div style={styles.summaryRow}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNum}>{students.length}</div>
              <div style={styles.summaryLabel}>登録生徒</div>
            </div>
            <div style={{ ...styles.summaryCard, ...(alertCount > 0 ? { borderColor: '#ef4444' } : {}) }}>
              <div style={{ ...styles.summaryNum, color: alertCount > 0 ? '#ef4444' : '#8a96aa' }}>{alertCount}</div>
              <div style={styles.summaryLabel}>アラート対象</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNum}>{selected.class_code}</div>
              <div style={styles.summaryLabel}>クラスコード</div>
            </div>
          </div>

          {/* クラス全体トレンド */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>クラス全体 気分スコア推移（直近14日）</div>
            {trendData.length === 0 ? (
              <p style={styles.empty}>まだデータがありません</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11 }} width={20} />
                  <Tooltip formatter={v => [`${v}`, '平均スコア']} />
                  <Line type="monotone" dataKey="avg" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 学生一覧（アラート統合） */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>生徒一覧（{students.length}名）</div>
            {students.length === 0 ? (
              <p style={styles.empty}>まだ登録した生徒がいません</p>
            ) : (
              <div style={styles.studentList}>
                {students.map(s => (
                  <div key={s.id}
                    style={{ ...styles.studentRow, ...(s.maxAlertLevel >= 3 ? { borderLeftColor: '#7c3aed' } : s.maxAlertLevel >= 2 ? { borderLeftColor: '#ef4444' } : s.maxAlertLevel >= 1 ? { borderLeftColor: '#f59e0b' } : {}) }}
                    onClick={() => navigate(`/student/${s.id}`)}
                  >
                    <div style={styles.studentTop}>
                      <div style={styles.studentName}>{s.display_name || '（匿名）'}</div>
                      {s.alerts.map(a => (
                        <span key={a.id} style={{ ...styles.alertBadge, background: LEVEL_COLOR[a.level] }}>
                          {LEVEL_LABEL[a.level]}
                        </span>
                      ))}
                    </div>

                    <div style={styles.studentScores}>
                      {/* 最新スコア */}
                      <div style={styles.scoreBlock}>
                        <div style={styles.scoreEmoji}>{s.latestScore ? SCORE_EMOJI[s.latestScore] : '—'}</div>
                        <div style={styles.scoreLabel}>総合</div>
                      </div>
                      {/* 各項目 */}
                      {s.latestDetail && Object.entries(DETAIL_LABELS).map(([key, label]) => (
                        <div key={key} style={styles.scoreBlock}>
                          <div style={{ ...styles.scoreSmall, color: (s.latestDetail[key] ?? 3) <= 2 ? '#ef4444' : '#4a5568' }}>
                            {s.latestDetail[key] ?? '—'}
                          </div>
                          <div style={styles.scoreLabel}>{label}</div>
                        </div>
                      ))}
                      {/* ミニグラフ */}
                      <div style={{ marginLeft: 'auto' }}>
                        <MiniGraph records={s.recentRecords.slice(-7)} />
                      </div>
                    </div>

                    {s.latestComment && (
                      <div style={styles.studentComment}>💬 {s.latestComment}</div>
                    )}
                    {s.latestDate && (
                      <div style={styles.studentDate}>最終記録: {s.latestDate}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniGraph({ records }) {
  if (records.length === 0) return <span style={{ color: '#b0b8cc', fontSize: '12px' }}>記録なし</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '28px' }}>
      {records.map((r, i) => (
        <div key={i} title={`${r.recorded_at}: ${r.score}`} style={{
          width: '8px',
          height: `${(r.score / 5) * 100}%`,
          background: r.score <= 2 ? '#ef4444' : r.score <= 3 ? '#f59e0b' : '#1D9E75',
          borderRadius: '2px', minHeight: '4px',
        }} />
      ))}
    </div>
  );
}

const styles = {
  loading: { padding: '40px', textAlign: 'center', color: '#8a96aa' },
  tabRow: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' },
  tab: { padding: '8px 18px', border: '2px solid #e8ecf4', borderRadius: '10px', background: 'white', fontSize: '14px', fontWeight: '700', color: '#8a96aa', cursor: 'pointer' },
  tabActive: { borderColor: '#1D9E75', background: '#e6f9f2', color: '#1D9E75' },
  summaryRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
  summaryCard: { flex: 1, background: 'white', borderRadius: '14px', padding: '16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '2px solid transparent' },
  summaryNum: { fontSize: '22px', fontWeight: '800', color: '#2d3a50' },
  summaryLabel: { fontSize: '12px', color: '#8a96aa', fontWeight: '700', marginTop: '4px' },
  card: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '13px', fontWeight: '800', color: '#1D9E75', letterSpacing: '0.8px', marginBottom: '16px' },
  empty: { color: '#b0b8cc', fontSize: '14px', textAlign: 'center', padding: '20px' },
  studentList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  studentRow: { padding: '14px 16px', borderRadius: '12px', background: '#fafbfc', borderLeft: '4px solid transparent', cursor: 'pointer', transition: 'all 0.2s' },
  studentTop: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
  studentName: { fontSize: '15px', fontWeight: '800', color: '#2d3a50' },
  alertBadge: { fontSize: '10px', fontWeight: '800', color: 'white', padding: '2px 8px', borderRadius: '20px' },
  studentScores: { display: 'flex', alignItems: 'center', gap: '16px' },
  scoreBlock: { textAlign: 'center' },
  scoreEmoji: { fontSize: '24px', lineHeight: 1 },
  scoreSmall: { fontSize: '18px', fontWeight: '800', lineHeight: 1 },
  scoreLabel: { fontSize: '10px', color: '#8a96aa', fontWeight: '700', marginTop: '2px' },
  studentComment: { fontSize: '13px', color: '#4a5568', background: '#f8f9fb', borderRadius: '8px', padding: '6px 10px', marginTop: '8px', lineHeight: '1.5' },
  studentDate: { fontSize: '11px', color: '#b0b8cc', marginTop: '6px' },
};
