import { NavLink } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Layout({ children }) {
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div style={styles.wrap}>
      <nav style={styles.nav}>
        <div style={styles.navBrand}>🌱 きもちチェック</div>
        <div style={styles.navLinks}>
          <NavLink to="/dashboard" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
            クラス一覧
          </NavLink>
          <NavLink to="/alerts" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
            アラート
          </NavLink>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>ログアウト</button>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', background: '#f0f4f8' },
  nav: { background: 'white', borderBottom: '1px solid #e8ecf4', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '24px', height: '60px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  navBrand: { fontSize: '16px', fontWeight: '800', color: '#1D9E75', marginRight: '8px' },
  navLinks: { display: 'flex', gap: '4px', flex: 1 },
  navLink: { padding: '6px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', color: '#8a96aa', transition: 'all 0.2s' },
  navLinkActive: { background: '#e6f9f2', color: '#1D9E75' },
  logoutBtn: { padding: '7px 16px', background: '#f0f2f8', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#8a96aa' },
  main: { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
};
