import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Calendar,
  Sparkles,
  CreditCard,
  UsersRound,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/client';
import { initials } from '../utils/format';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'analytics:read' },
  { to: '/leads', label: 'Leads', icon: Users, perm: 'leads:read' },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare, perm: 'leads:read' },
  { to: '/meetings', label: 'Meetings', icon: Calendar, perm: 'meetings:read' },
  { to: '/ai', label: 'AI Assistant', icon: Sparkles, perm: 'ai:use' },
  { to: '/team', label: 'Team', icon: UsersRound, perm: 'team:read' },
  { to: '/billing', label: 'Billing', icon: CreditCard, perm: 'billing:read' },
];

export default function Layout() {
  const { user, team, logout, can } = useAuth();
  const { liveNotification, clearLive } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);

  async function loadNotifications() {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (liveNotification) {
      setToast(liveNotification);
      setNotifications((prev) => [liveNotification, ...prev]);
      setUnread((n) => n + 1);
      clearLive();
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [liveNotification, clearLive]);

  async function markAllRead() {
    await api.post('/notifications/read-all');
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 13a8 8 0 0 1 16 0" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="6" cy="15" r="1.6" fill="#F5A623" />
              <circle cx="12" cy="16" r="1.6" fill="white" />
              <circle cx="18" cy="15" r="1.6" fill="#D9F3F1" />
            </svg>
          </div>
          <div className="brand-text">
            <strong>Relay</strong>
            <span>{team?.name || 'AI CRM'}</span>
          </div>
          <button className="mobile-toggle" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list">
          {links.filter((l) => can(l.perm)).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip" style={{ marginBottom: '0.8rem' }}>
            <div className="avatar">{initials(user?.name)}</div>
            <div className="meta">
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', color: 'rgba(255,255,255,0.8)' }}
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-secondary mobile-toggle" type="button" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div>
              <strong style={{ fontFamily: 'var(--font-display)' }}>Keep every deal in motion</strong>
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                Plan: {team?.plan || 'free'} · Invite: {team?.inviteCode}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
            <button className="notif-bell" type="button" onClick={() => setNotifOpen((v) => !v)}>
              <Bell size={18} />
              {unread > 0 && <span className="count">{unread}</span>}
            </button>
            {notifOpen && (
              <div className="notif-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', borderBottom: '1px solid var(--line)' }}>
                  <strong>Notifications</strong>
                  <button className="btn btn-ghost" type="button" onClick={markAllRead}>Mark all read</button>
                </div>
                {notifications.length === 0 ? (
                  <div className="empty">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id || n.title + n.createdAt} className={`notif-item ${n.read ? '' : 'unread'}`}>
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="user-chip">
              <div className="avatar lg">{initials(user?.name)}</div>
              <div className="meta">
                <strong>{user?.name}</strong>
                <span>{user?.title || user?.role}</span>
              </div>
            </div>
          </div>
        </header>
        <Outlet />
      </div>

      {toast && (
        <div className="toast">
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
