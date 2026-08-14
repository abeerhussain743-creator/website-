import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PhoneCall,
  FileText,
  Upload,
  Sparkles,
  CreditCard,
  LogOut,
  Bell,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const links = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/upload', label: 'Upload Call', icon: Upload },
  { to: '/app/calls', label: 'Calls', icon: PhoneCall },
  { to: '/app/proposals', label: 'Proposals', icon: FileText },
  { to: '/app/templates', label: 'Templates', icon: Sparkles },
  { to: '/app/billing', label: 'Billing', icon: CreditCard },
];

export default function AppLayout() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [openNotes, setOpenNotes] = useState(false);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setNotifications(data.notifications || [])).catch(() => {});
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  async function markRead() {
    await api.post('/notifications/read');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r border-[var(--color-line)] bg-white/70 backdrop-blur-xl px-5 py-6">
        <div className="flex items-center justify-between gap-3 mb-8">
          <button onClick={() => navigate('/app')} className="text-left">
            <div className="font-display text-2xl font-800 tracking-tight text-[var(--color-ink)]">DealFlow</div>
            <div className="text-xs uppercase tracking-[0.18em] text-teal-700/80">AI</div>
          </button>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap transition ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-[var(--color-ink-soft)] hover:bg-teal-50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 hidden lg:block rounded-2xl bg-[var(--color-mist)] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-teal-800/70 mb-1">Workspace</div>
          <div className="font-medium">{organization?.name}</div>
          <div className="text-sm text-[var(--color-ink-soft)] mt-1 capitalize">{organization?.plan} plan</div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--color-line)] bg-white/75 backdrop-blur-xl px-5 py-4">
          <div>
            <div className="text-sm text-[var(--color-ink-soft)]">Signed in as</div>
            <div className="font-medium">{user?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="relative grid place-items-center h-10 w-10 rounded-xl border border-[var(--color-line)] bg-white hover:bg-teal-50"
                onClick={() => {
                  setOpenNotes((v) => !v);
                  if (!openNotes) markRead();
                }}
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[var(--color-coral)] text-white text-[11px] grid place-items-center">
                    {unread}
                  </span>
                )}
              </button>
              {openNotes && (
                <div className="absolute right-0 mt-2 w-80 glass-panel rounded-2xl p-3 z-30">
                  <div className="font-medium mb-2 px-1">Notifications</div>
                  <div className="max-h-72 overflow-auto space-y-2">
                    {notifications.length === 0 && (
                      <div className="text-sm text-[var(--color-ink-soft)] px-1 py-4">No notifications yet.</div>
                    )}
                    {notifications.map((n) => (
                      <button
                        key={n._id}
                        className="w-full text-left rounded-xl px-3 py-2 hover:bg-teal-50"
                        onClick={() => {
                          setOpenNotes(false);
                          if (n.link) navigate(n.link.replace('/proposals/', '/app/proposals/').replace('/calls/', '/app/calls/'));
                        }}
                      >
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-[var(--color-ink-soft)]">{n.body}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm hover:bg-rose-50"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </header>
        <main className="px-5 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
