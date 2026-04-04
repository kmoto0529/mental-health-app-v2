import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const LEVEL_COLOR = { 1: '#f59e0b', 2: '#ef4444', 3: '#7c3aed' };
const LEVEL_LABEL = { 1: 'Lv.1 注意', 2: 'Lv.2 警戒', 3: 'Lv.3 緊急' };
const REASON_LABEL = {
  score_low:   '平均スコアが低い',
  chat_spike:  'チャット急増',
  crisis_word: '危機ワード検出',
  score_drop:  'スコア急落',
};

export default function Alerts() {
  const [alerts, setAlerts]     = useState([]);
  const [filter, setFilter]     = useState('unresolved');
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadAlerts(); }, [filter]);

  async function loadAlerts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 担当クラスの学生IDを取得
    const { data: tcData } = await supabase
      .from('teacher_classes')
      .select('class_id')
      .eq('teacher_id', user.id);
    const classIds = (tcData || []).map(r => r.class_id);
    if (classIds.length === 0) { setAlerts([]); setLoading(false); return; }

    const { data: stuData } = await supabase
      .from('students')
      .select('id, display_name')
      .in('class_id', classIds);
    const studentMap = Object.fromEntries((stuData || []).map(s => [s.id, s.display_name]));

    let query = supabase
      .from('alerts')
      .select('id, student_id, level, reason, detail, created_at, resolved_at, teacher_memo')
      .in('student_id', Object.keys(studentMap))
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter === 'unresolved') query = query.is('resolved_at', null);

    const { data } = await query;
    setAlerts((data || []).map(a => ({ ...a, studentName: studentMap[a.student_id] || '不明' })));
    setLoading(false);
  }

  async function resolve(alertId, memo) {
    await supabase.from('alerts').update({ resolved_at: new Date().toISOString(), teacher_memo: memo }).eq('id', alertId);
    loadAlerts();
  }

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>アラート一覧</h2>
        <div style={styles.filterRow}>
          {['unresolved', 'all'].map(f => (
            <button
              key={f}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f === 'unresolved' ? '未対応のみ' : 'すべて'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>読み込み中...</div>
      ) : alerts.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
          {filter === 'unresolved' ? '未対応のアラートはありません' : 'アラートはありません'}
        </div>
      ) : (
        alerts.map(a => (
          <AlertCard key={a.id} alert={a} onResolve={resolve} onNavigate={() => navigate(`/student/${a.student_id}`)} />
        ))
      )}
    </div>
  );
}

function AlertCard({ alert, onResolve, onNavigate }) {
  const [memo, setMemo]     = useState(alert.teacher_memo || '');
  const [saving, setSaving] = useState(false);

  async function handleResolve() {
    setSaving(true);
    await onResolve(alert.id, memo);
    setSaving(false);
  }

  return (
    <div style={{ ...styles.card, borderLeftColor: LEVEL_COLOR[alert.level] }}>
      <div style={styles.cardHeader}>
        <span style={{ ...styles.levelBadge, background: LEVEL_COLOR[alert.level] }}>
          {LEVEL_LABEL[alert.level]}
        </span>
        <span style={styles.studentName} onClick={onNavigate}>{alert.studentName}</span>
        <span style={styles.date}>{alert.created_at.slice(0,10)}</span>
        {alert.resolved_at && <span style={styles.resolvedBadge}>対応済み</span>}
      </div>
      <div style={styles.reason}>{REASON_LABEL[alert.reason] || alert.reason || '—'}</div>
      {alert.detail && (
        <div style={styles.detail}>
          {JSON.stringify(alert.detail)}
        </div>
      )}
      <textarea
        style={styles.memo}
        placeholder="対応メモを入力..."
        value={memo}
        onChange={e => setMemo(e.target.value)}
        rows={2}
      />
      {!alert.resolved_at && (
        <button style={styles.resolveBtn} onClick={handleResolve} disabled={saving}>
          {saving ? '保存中...' : '✓ 対応済みにする'}
        </button>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '20px', fontWeight: '800', color: '#2d3a50' },
  filterRow: { display: 'flex', gap: '6px' },
  filterBtn: { padding: '7px 16px', border: '2px solid #e8ecf4', borderRadius: '10px', background: 'white', fontSize: '13px', fontWeight: '700', color: '#8a96aa' },
  filterActive: { borderColor: '#1D9E75', background: '#e6f9f2', color: '#1D9E75' },
  loading: { padding: '40px', textAlign: 'center', color: '#8a96aa' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#8a96aa', fontSize: '15px', fontWeight: '700' },
  card: { background: 'white', borderRadius: '0 14px 14px 0', borderLeft: '5px solid', padding: '16px 20px', marginBottom: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
  levelBadge: { color: 'white', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px' },
  studentName: { fontSize: '15px', fontWeight: '800', color: '#2d3a50', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#e8ecf4' },
  date: { fontSize: '12px', color: '#8a96aa', marginLeft: 'auto' },
  resolvedBadge: { fontSize: '11px', color: '#1D9E75', fontWeight: '700', background: '#e6f9f2', padding: '2px 8px', borderRadius: '20px' },
  reason: { fontSize: '14px', color: '#4a5568', marginBottom: '8px', fontWeight: '600' },
  detail: { fontSize: '12px', color: '#8a96aa', background: '#f8f9fb', borderRadius: '6px', padding: '6px 10px', marginBottom: '8px', fontFamily: 'monospace' },
  memo: { width: '100%', border: '1px solid #e8ecf4', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', resize: 'none', outline: 'none' },
  resolveBtn: { marginTop: '8px', padding: '7px 16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700' },
};
