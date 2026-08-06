import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import ProfitLoss from './pages/ProfitLoss';
import BalanceSheet from './pages/BalanceSheet';
import CashFlow from './pages/CashFlow';
import GeneralLedger from './pages/GeneralLedger';
import TrialBalance from './pages/TrialBalance';
import ChartOfAccounts from './pages/ChartOfAccounts';
import ShopifySales from './pages/ShopifySales';
import InventoryPage from './pages/InventoryPage';
import BankReconciliation from './pages/BankReconciliation';
import Payouts from './pages/Payouts';
import Expenses from './pages/Expenses';
import Customers from './pages/Customers';
import Vendors from './pages/Vendors';
import TaxReports from './pages/TaxReports';
import AuditLog from './pages/AuditLog';
import FiscalClose from './pages/FiscalClose';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page" style={{ padding: '4rem' }}>Loading Meridian…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/app"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="profit-loss" element={<ProfitLoss />} />
        <Route path="balance-sheet" element={<BalanceSheet />} />
        <Route path="cash-flow" element={<CashFlow />} />
        <Route path="general-ledger" element={<GeneralLedger />} />
        <Route path="trial-balance" element={<TrialBalance />} />
        <Route path="accounts" element={<ChartOfAccounts />} />
        <Route path="sales" element={<ShopifySales />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="bank" element={<BankReconciliation />} />
        <Route path="payouts" element={<Payouts />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="customers" element={<Customers />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="tax" element={<TaxReports />} />
        <Route path="fiscal-close" element={<FiscalClose />} />
        <Route path="audit" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
