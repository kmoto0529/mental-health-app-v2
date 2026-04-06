import { useState } from 'react';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [needsChange, setNeedsChange] = useState(false);
  const [newPw, setNewPw]       = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setError('メールアドレスまたはパスワードが違います'); setLoading(false); return; }

    // 初回ログインチェック
    const { data: teacher } = await supabase
      .from('teachers').select('password_changed').eq('id', data.user.id).maybeSingle();

    if (teacher && !teacher.password_changed) {
      setNeedsChange(true);
    }
    setLoading(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError('');
    if (newPw.length < 6) { setError('6文字以上で入力してください'); return; }
    if (newPw !== newPwConfirm) { setError('パスワードが一致しません'); return; }

    setLoading(true);
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPw });
    if (pwErr) { setError('パスワード変更に失敗しました。もう一度お試しください。'); setLoading(false); return; }

    // フラグ更新
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('teachers').update({ password_changed: true }).eq('id', user.id);
    setNeedsChange(false);
    setLoading(false);
  }

  if (needsChange) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.logo}>🔑</div>
          <h1 style={styles.title}>パスワードを変更</h1>
          <p style={styles.sub}>セキュリティのため、初回ログイン時にパスワードを変更してください</p>
          <form onSubmit={handleChangePassword} style={styles.form}>
            <label style={styles.label}>新しいパスワード</label>
            <input style={styles.input} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="6文字以上" required />
            <label style={styles.label}>もう一度入力</label>
            <input style={styles.input} type="password" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} placeholder="確認用" required />
            {error && <p style={styles.error}>{error}</p>}
            <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading ? '変更中...' : 'パスワードを変更する'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>🌱</div>
        <h1 style={styles.title}>きもちチェック</h1>
        <p style={styles.sub}>教員ダッシュボード</p>
        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>メールアドレス</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="teacher@school.jp"
            required
            autoComplete="email"
          />
          <label style={styles.label}>パスワード</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '20px' },
  card: { background: 'white', borderRadius: '24px', padding: '40px 36px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { fontSize: '40px', textAlign: 'center', marginBottom: '8px' },
  title: { fontSize: '22px', fontWeight: '800', textAlign: 'center', color: '#2d3a50', margin: '0 0 4px' },
  sub: { fontSize: '13px', color: '#8a96aa', textAlign: 'center', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '700', color: '#4a5568', marginTop: '10px' },
  input: { padding: '12px 14px', border: '2px solid #e8ecf4', borderRadius: '12px', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' },
  error: { fontSize: '13px', color: '#ef4444', fontWeight: '600', marginTop: '4px' },
  btn: { marginTop: '20px', padding: '14px', background: 'linear-gradient(135deg,#1D9E75,#0d7055)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' },
};
