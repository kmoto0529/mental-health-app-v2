import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import StudentDetail from './pages/StudentDetail';
import Layout from './components/Layout';

export default function App() {
  const [session, setSession] = useState(undefined);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkPasswordChanged(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) checkPasswordChanged(s.user.id);
      else setNeedsPasswordChange(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkPasswordChanged(userId) {
    setChecking(true);
    const { data: teacher } = await supabase
      .from('teachers').select('password_changed').eq('id', userId).maybeSingle();
    if (teacher && !teacher.password_changed) {
      setNeedsPasswordChange(true);
    } else {
      setNeedsPasswordChange(false);
    }
    setChecking(false);
  }

  if (session === undefined || checking) {
    return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#8a96aa' }}>読み込み中...</div>;
  }

  if (!session) return <Login />;

  if (needsPasswordChange) {
    return <ChangePassword onComplete={() => setNeedsPasswordChange(false)} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/student/:id" element={<StudentDetail />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
