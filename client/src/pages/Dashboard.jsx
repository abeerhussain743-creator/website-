import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import { commerceApi, reportsApi } from '../api/client';
import { money, shortDate } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  async function load() {
    try {
      setData(await reportsApi.dashboard());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function syncDemo() {
    setSyncing(true);
    try {
      await commerceApi.syncDemo();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  if (error) return <div className="page">Error: {error}</div>;
  if (!data) return <div className="page">Loading dashboard…</div>;

  const { kpis, pnl, recentOrders, recentPayouts, audit } = data;
  const chartData = [...(pnl.revenue || [])]
    .slice(0, 6)
    .map((a) => ({ name: a.accountName.replace('Product ', ''), value: a.balance }));

  // Build simple monthly-ish series from recent orders
  const salesSeries = [...recentOrders]
    .reverse()
    .map((o) => ({ name: shortDate(o.createdAt), total: o.total }));

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Financial Dashboard</h1>
          <p>Live view of Shopify-connected books — revenue, cash, inventory, and recent postings.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn sea" type="button" onClick={syncDemo} disabled={syncing}>
            <RefreshCw size={16} /> {syncing ? 'Syncing…' : 'Shopify Sync'}
          </button>
          <Link className="btn secondary" to="/app/general-ledger">
            General Ledger
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Revenue YTD</div>
          <div className="value money">{money(kpis.revenueYtd)}</div>
        </div>
        <div className="kpi">
          <div className="label">Net Income YTD</div>
          <div className="value money">{money(kpis.netIncomeYtd)}</div>
        </div>
        <div className="kpi">
          <div className="label">Cash & Clearing</div>
          <div className="value money">{money(kpis.cashAndBank)}</div>
        </div>
        <div className="kpi">
          <div className="label">Inventory Value</div>
          <div className="value money">{money(kpis.inventoryValue)}</div>
        </div>
      </div>

      <div className="split-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Shopify sales pulse</h2>
            <span className="badge">{recentOrders.length} recent</span>
          </div>
          <div style={{ height: 260, padding: '0 0.5rem 1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesSeries.length ? salesSeries : chartData}>
                <defs>
                  <linearGradient id="seaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f8f84" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#2f8f84" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Area
                  type="monotone"
                  dataKey={salesSeries.length ? 'total' : 'value'}
                  stroke="#1f6b63"
                  fill="url(#seaFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Balance sheet snapshot</h2>
            <span className="badge">{data.sheet.balanced ? 'In balance' : 'Review'}</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <tbody>
                <tr>
                  <td>Total assets</td>
                  <td className="num money">{money(data.sheet.totalAssets)}</td>
                </tr>
                <tr>
                  <td>Total liabilities</td>
                  <td className="num money">{money(data.sheet.totalLiabilities)}</td>
                </tr>
                <tr>
                  <td>Equity + NI</td>
                  <td className="num money">{money(data.sheet.totalEquity)}</td>
                </tr>
                <tr>
                  <td>Customers / Vendors</td>
                  <td className="num">
                    {kpis.customers} / {kpis.vendors}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="split-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Recent Shopify orders</h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td>{o.orderNumber}</td>
                    <td>{o.customerId?.name || 'Guest'}</td>
                    <td>{shortDate(o.createdAt)}</td>
                    <td className="num money">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Audit trail</h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a._id}>
                    <td>{shortDate(a.createdAt)}</td>
                    <td>
                      <span className="badge">{a.action}</span>
                    </td>
                    <td style={{ whiteSpace: 'normal', maxWidth: 280 }}>{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentPayouts?.[0] && (
            <p className="muted" style={{ padding: '0.85rem 1.1rem' }}>
              Latest payout {recentPayouts[0].shopifyPayoutId}: {money(recentPayouts[0].netAmount)} on{' '}
              {shortDate(recentPayouts[0].depositDate)}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
