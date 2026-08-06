import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Scale,
  Waves,
  BookOpen,
  ListChecks,
  ShoppingBag,
  Package,
  Landmark,
  CreditCard,
  Receipt,
  Users,
  Building2,
  Percent,
  CalendarCheck2,
  ScrollText,
  LogOut,
  Library,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AppLayout.css';

const nav = [
  { to: '/app', end: true, label: 'Financial Dashboard', icon: LayoutDashboard },
  { to: '/app/profit-loss', label: 'Profit & Loss', icon: TrendingUp },
  { to: '/app/balance-sheet', label: 'Balance Sheet', icon: Scale },
  { to: '/app/cash-flow', label: 'Cash Flow', icon: Waves },
  { to: '/app/general-ledger', label: 'General Ledger', icon: BookOpen },
  { to: '/app/trial-balance', label: 'Trial Balance', icon: ListChecks },
  { to: '/app/accounts', label: 'Chart of Accounts', icon: Library },
  { to: '/app/sales', label: 'Shopify Sales', icon: ShoppingBag },
  { to: '/app/inventory', label: 'Inventory', icon: Package },
  { to: '/app/bank', label: 'Bank Reconciliation', icon: Landmark },
  { to: '/app/payouts', label: 'Payout Reconciliation', icon: CreditCard },
  { to: '/app/expenses', label: 'Expense Tracking', icon: Receipt },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/vendors', label: 'Vendors', icon: Building2 },
  { to: '/app/tax', label: 'Tax Reports', icon: Percent },
  { to: '/app/fiscal-close', label: 'Fiscal Year Closing', icon: CalendarCheck2 },
  { to: '/app/audit', label: 'Audit Log', icon: ScrollText },
];

export default function AppLayout() {
  const { user, company, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-glyph" />
          <div>
            <strong>Meridian</strong>
            <small>{company?.companyName || 'Books'}</small>
          </div>
        </div>
        <nav>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div>
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
          </div>
          <button type="button" className="btn secondary" onClick={logout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
