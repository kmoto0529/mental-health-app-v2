import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SCORE_EMOJI = { 5: '😄', 4: '🙂', 3: '😐', 2: '😟', 1: '😢' };

export default function Dashboard() {
  const [classes, setClasses]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [students, setStudents] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  // 担当クラス一覧を取得
  useEffect(() => {
    async function loadClasses() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: tcData } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', user.id);

      const classIds = (tcData || []).map(r => r.class_id);
      if (classIds.length === 0) { setLoading(false); return; }

      const { data: clsData } = await supabase
        .from('classes')
        .select('id, grade, name, class_code')
        .in('id', classIds);

      setClasses(clsData || []);
      if (clsData?.length > 0) setSelected(clsData[0]);
      setLoading(false);
    }
    loadClasses();
  }, []);

  // クラス選択時：学生一覧 + クラス全体トレンド
  useEffect(() => {
    if (!selected) return;
    loadClassData(selected.id);
  }, [selected]);

  async function loadClassData(classId) {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    const sinceStr = since.toISOString().slice(0, 10);

    // 学生一覧
    const { data: stuData } = await supabase
      .from('students')
      .select('id, display_name')
      .eq('class_id', classId)
      .order('display_name');

    // 直近7日の気分記録
    const { data: moodData } = await supabase
      .from('mood_records')
      .select('student_id, score, recorded_at')
      .in('student_id', (stuData || []).map(s => s.id))
      .gte('recorded_at', sinceStr)
      .order('recorded_at');

    // 学生ごとに直近スコアをまとめる
    const moodByStudent = {};
    (moodData || []).forEach(r => {
      if (!moodByStudent[r.student_id]) moodByStudent[r.student_id] = [];
      moodByStudent[r.student_id].push(r);
    });

    const enriched = (stuData || []).map(s => ({
      ...s,
      recentRecords: moodByStudent[s.id] || [],
      latestScore: (moodByStudent[s.id] || []).at(-1)?.score ?? null,
    }));
    setStudents(enriched);

    // クラス全体トレンド（日別平均）
    const dayMap = {};
    (moodData || []).forEach(r => {
      if (!dayMap[r.recorded_at]) dayMap[r.recorded_at] = [];
      dayMap[r.recorded_at].push(r.score);
    });
    const trend = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => ({
        date: date.slice(5),
        avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      }));
    setTrendData(trend);
  }

  if (loading) return <div style={styles.loading}>読み込み中...</div>;

  return (
    <div>
      {/* クラスタブ */}
      <div style={styles.tabRow}>
        {classes.map(c => (
          <button
            key={c.id}
            style={{ ...styles.tab, ...(selected?.id === c.id ? styles.tabActive : {}) }}
            onClick={() => setSelected(c)}
          >
            {c.grade}年{c.name}
          </button>
        ))}
      </div>

      {selected && (
        <>
          {/* クラスコード */}
          <div style={styles.codeBox}>
            クラスコード：<strong style={{ fontSize: '18px', letterSpacing: '3px' }}>{selected.class_code}</strong>
            <span style={styles.codeHint}>（学生に配布するコード）</span>
          </div>

          {/* クラス全体トレンド */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>クラス全体 気分スコア推移（直近14日）</div>
            {trendData.length === 0 ? (
              <p style={styles.empty}>まだデータがありません</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 12 }} width={24} />
                  <Tooltip formatter={v => [`${v}`, '平均スコア']} />
                  <Line type="monotone" dataKey="avg" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 学生一覧 */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>学生一覧（{students.length}名）</div>
            {students.length === 0 ? (
              <p style={styles.empty}>まだ登録した学生がいません</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>名前 / 出席番号</th>
                    <th style={styles.th}>最新スコア</th>
                    <th style={styles.th}>直近7日</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} style={styles.tr}>
                      <td style={styles.td}>{s.display_name || '（匿名）'}</td>
                      <td style={{ ...styles.td, textAlign: 'center', fontSize: '22px' }}>
                        {s.latestScore ? SCORE_EMOJI[s.latestScore] : '－'}
                      </td>
                      <td style={styles.td}>
                        <MiniGraph records={s.recentRecords.slice(-7)} />
                      </td>
                      <td style={styles.td}>
                        <button style={styles.detailBtn} onClick={() => navigate(`/student/${s.id}`)}>
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniGraph({ records }) {
  if (records.length === 0) return <span style={{ color: '#b0b8cc', fontSize: '13px' }}>記録なし</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '28px' }}>
      {records.map((r, i) => (
        <div
          key={i}
          title={`${r.recorded_at}: ${r.score}`}
          style={{
            width: '10px',
            height: `${(r.score / 5) * 100}%`,
            background: r.score <= 2 ? '#ef4444' : r.score <= 3 ? '#f59e0b' : '#1D9E75',
            borderRadius: '2px',
            minHeight: '4px',
          }}
        />
      ))}
    </div>
  );
}

const styles = {
  loading: { padding: '40px', textAlign: 'center', color: '#8a96aa' },
  tabRow: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: { padding: '8px 18px', border: '2px solid #e8ecf4', borderRadius: '10px', background: 'white', fontSize: '14px', fontWeight: '700', color: '#8a96aa' },
  tabActive: { borderColor: '#1D9E75', background: '#e6f9f2', color: '#1D9E75' },
  codeBox: { background: 'white', borderRadius: '12px', padding: '12px 18px', marginBottom: '16px', fontSize: '14px', color: '#4a5568', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  codeHint: { fontSize: '12px', color: '#b0b8cc' },
  card: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '13px', fontWeight: '800', color: '#1D9E75', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '16px' },
  empty: { color: '#b0b8cc', fontSize: '14px', textAlign: 'center', padding: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: '12px', fontWeight: '800', color: '#8a96aa', padding: '8px 12px', borderBottom: '2px solid #f0f2f8' },
  tr: { borderBottom: '1px solid #f0f2f8' },
  td: { padding: '12px', fontSize: '14px', color: '#2d3a50' },
  detailBtn: { padding: '5px 14px', background: '#f0f2f8', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: '#4a5568' },
};
