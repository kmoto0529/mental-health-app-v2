import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [alerts, setAlerts]   = useState([]);

  useEffect(() => {
    async function load() {
      const { data: stu } = await supabase.from('students').select('display_name').eq('id', id).single();
      setStudent(stu);

      const since = new Date(); since.setDate(since.getDate() - 29);
      const { data: moodData } = await supabase
        .from('mood_records')
        .select('score, detail, recorded_at')
        .eq('student_id', id)
        .gte('recorded_at', since.toISOString().slice(0,10))
        .order('recorded_at');
      setRecords(moodData || []);

      const { data: alertData } = await supabase
        .from('alerts')
        .select('id, level, reason, created_at, resolved_at, teacher_memo')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      setAlerts(alertData || []);
    }
    load();
  }, [id]);

  const chartData = records.map(r => ({
    date: r.recorded_at.slice(5),
    総合: r.score,
    学校: r.detail?.school ?? null,
    友人: r.detail?.friend ?? null,
    睡眠: r.detail?.sleep ?? null,
  }));

  return (
    <div>
      <button style={styles.back} onClick={() => navigate('/dashboard')}>← 一覧に戻る</button>

      <div style={styles.header}>
        <div style={styles.name}>{student?.display_name || '（匿名）'}</div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>気分スコア推移（直近30日）</div>
        {records.length === 0 ? (
          <p style={styles.empty}>記録がありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11 }} width={20} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="総合" stroke="#1D9E75" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="学校" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="友人" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="睡眠" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>アラート履歴</div>
        {alerts.length === 0 ? (
          <p style={styles.empty}>アラートなし</p>
        ) : (
          alerts.map(a => <AlertRow key={a.id} alert={a} onUpdate={() => load()} />)
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, onUpdate }) {
  const [memo, setMemo] = useState(alert.teacher_memo || '');
  const [saving, setSaving] = useState(false);

  const levelColors = { 1: '#f59e0b', 2: '#ef4444', 3: '#7c3aed' };
  const levelLabels = { 1: 'Lv.1 注意', 2: 'Lv.2 警戒', 3: 'Lv.3 緊急' };

  async function saveResolve() {
    setSaving(true);
    await supabase.from('alerts').update({
      teacher_memo: memo,
      resolved_at: new Date().toISOString(),
    }).eq('id', alert.id);
    setSaving(false);
    onUpdate?.();
  }

  return (
    <div style={{ ...styles.alertRow, borderLeftColor: levelColors[alert.level] }}>
      <div style={styles.alertHeader}>
        <span style={{ ...styles.levelBadge, background: levelColors[alert.level] }}>{levelLabels[alert.level]}</span>
        <span style={styles.alertDate}>{alert.created_at.slice(0,10)}</span>
        {alert.resolved_at && <span style={styles.resolvedBadge}>対応済み</span>}
      </div>
      <div style={styles.alertReason}>{alert.reason || '—'}</div>
      <textarea
        style={styles.memoInput}
        placeholder="対応メモを入力..."
        value={memo}
        onChange={e => setMemo(e.target.value)}
        rows={2}
      />
      {!alert.resolved_at && (
        <button style={styles.resolveBtn} onClick={saveResolve} disabled={saving}>
          {saving ? '保存中...' : '✓ 対応済みにする'}
        </button>
      )}
    </div>
  );
}

const styles = {
  back: { background: 'none', border: 'none', color: '#1D9E75', fontSize: '14px', fontWeight: '700', padding: '0 0 16px', cursor: 'pointer' },
  header: { marginBottom: '16px' },
  name: { fontSize: '22px', fontWeight: '800', color: '#2d3a50' },
  card: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '13px', fontWeight: '800', color: '#1D9E75', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '16px' },
  empty: { color: '#b0b8cc', fontSize: '14px', textAlign: 'center', padding: '20px' },
  alertRow: { borderLeft: '4px solid', padding: '12px 14px', marginBottom: '12px', borderRadius: '0 8px 8px 0', background: '#fafafa' },
  alertHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
  levelBadge: { color: 'white', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '20px' },
  alertDate: { fontSize: '12px', color: '#8a96aa' },
  resolvedBadge: { fontSize: '11px', color: '#1D9E75', fontWeight: '700', background: '#e6f9f2', padding: '2px 8px', borderRadius: '20px' },
  alertReason: { fontSize: '13px', color: '#4a5568', marginBottom: '8px' },
  memoInput: { width: '100%', border: '1px solid #e8ecf4', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', resize: 'none', outline: 'none' },
  resolveBtn: { marginTop: '8px', padding: '6px 14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700' },
};
