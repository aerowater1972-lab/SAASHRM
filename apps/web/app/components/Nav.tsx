'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';

export default function Nav() {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenantId, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { data: notifs = [] } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const unread = unreadData?.count ?? 0;
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/admin/roles', label: 'Admin' },
    { href: '/employees', label: 'Employees' },
    { href: '/employees/organization', label: 'Org' },
    { href: '/employees/movements', label: 'Movements' },
    { href: '/expenses', label: 'Expenses' },
    { href: '/leaves', label: 'Leave' },
    { href: '/attendance', label: 'Attendance' },
    { href: '/payroll', label: 'Payroll' },
    { href: '/payroll/salary-components', label: 'Salary Comp' },
    { href: '/payroll/bank-transfers', label: 'Bank Tx' },
    { href: '/benefits/eligibility-rules', label: 'Elig Rules' },
    { href: '/payslips', label: 'Payslips' },
    { href: '/assets', label: 'Assets' },
    { href: '/benefits', label: 'Benefits' },
    { href: '/jobs', label: 'Jobs' },
    { href: '/candidates', label: 'Candidates' },
    { href: '/applications', label: 'Apps' },
    { href: '/goals', label: 'Goals' },
    { href: '/learning/trainings', label: 'Learning' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/cycles', label: 'Cycles' },
    { href: '/cycles/calibrations', label: 'Calibrate' },
    { href: '/resignations', label: 'Exit' },
    { href: '/loans', label: 'Loans' },
    { href: '/profile', label: 'Profile' },
    { href: '/profile/preferences', label: 'Prefs' },
  ];

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  const linkStyle = (href: string): CSSProperties => ({
    color: pathname === href ? 'var(--text)' : 'var(--muted)',
    fontWeight: pathname === href ? 600 : 400,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  });

  return (
    <header className="navbar">
      <div className="nav-brand">
        <strong>Flexy HRMS</strong>
        <button
          className="hamburger"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      <nav className={`nav-links${menuOpen ? ' open' : ''}`}>
        {links.map((l: any) => (
          <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={linkStyle(l.href)}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="nav-utility">
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text)', fontSize: 14, position: 'relative' }}
          >
            🔔
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: 8, fontSize: 10, padding: '0 5px', lineHeight: '16px', minWidth: 16, textAlign: 'center' }}>
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, width: 320, maxHeight: 360, overflowY: 'auto', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.15)', zIndex: 100, padding: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Notifications</strong>
                <button onClick={() => markAllRead.mutate()} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11 }}>Mark all read</button>
              </div>
              {notifs.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 12, padding: 8, margin: 0 }}>No notifications</p>}
              {notifs.map((n: any) => (
                <div key={n.id} onClick={() => { if (!n.readStatus) markRead.mutate(n.id); }} style={{ padding: '8px 10px', marginBottom: 4, borderRadius: 6, cursor: 'pointer', background: n.readStatus ? 'transparent' : 'var(--primary-light, rgba(59,130,246,.08))', fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{n.type}</div>
                  <div style={{ color: 'var(--muted)', marginTop: 2 }}>{n.message}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 10, marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString('id-ID')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={toggle}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text)', fontSize: 13 }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <span className="nav-user" style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{user?.email}</span>
        <button className="btn btn-danger" onClick={onLogout}>Log out</button>
      </div>

      <style>{`
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
        }
        .nav-brand { display: flex; align-items: center; gap: 12px; }
        .hamburger {
          display: none;
          background: none;
          border: none;
          color: var(--text);
          cursor: pointer;
          fontSize: 20px;
          padding: 0;
        }
        .nav-links {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          flex: 1;
          justify-content: center;
        }
        .nav-utility { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        @media (max-width: 768px) {
          .hamburger { display: block; }
          .nav-links {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            flex-direction: column;
            align-items: stretch;
            gap: 4px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-top: none;
            padding: 12px 16px;
            z-index: 50;
            box-shadow: 0 8px 16px rgba(0,0,0,.12);
          }
          .nav-links.open { display: flex; }
          .nav-links a { padding: 8px 4px; border-bottom: 1px solid var(--border); }
          .nav-user { display: none; }
          .nav-utility { gap: 8px; }
        }
      `}</style>
    </header>
  );
}
