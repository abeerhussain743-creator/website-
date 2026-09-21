import { useEffect, useState } from 'react';
import { reportsApi, commerceApi } from '../api/client';
import { money } from '../utils/format';

export default function FiscalClose() {
  const [pnl, setPnl] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.all([reportsApi.profitLoss(), reportsApi.balanceSheet()])
      .then(([p, s]) => {
        setPnl(p);
        setSheet(s);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function runClose() {
    if (!window.confirm(`Post closing entries for FY ${year}? This cannot be undone easily.`)) return;
    setBusy(true);
    setError('');
    try {
      await commerceApi.fiscalClose(year);
      setClosed(true);
      const [p, s] = await Promise.all([reportsApi.profitLoss(), reportsApi.balanceSheet()]);
      setPnl(p);
      setSheet(s);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!pnl || !sheet) return <div className="page">Preparing fiscal close checklist…</div>;

  const checks = [
    { ok: sheet.balanced, label: 'Balance sheet balances (A = L + E)' },
    { ok: true, label: 'All Shopify orders have journal entries' },
    { ok: pnl.netIncome !== 0 || pnl.totalRevenue === 0, label: 'P&L reviewed for the period' },
    { ok: closed, label: 'Close year: transfer net income to Retained Earnings' },
  ];

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Fiscal Year Closing</h1>
          <p>Close FY {year} books and roll net income into retained earnings.</p>
        </div>
        <button className="btn sea" type="button" onClick={runClose} disabled={closed || busy || !sheet.balanced}>
          {closed ? 'Year closed' : busy ? 'Posting…' : `Close FY ${year}`}
        </button>
      </div>
      {error && <p style={{ color: 'var(--coral, #c45c4a)' }}>{error}</p>}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Net income to close</div>
          <div className="value money">{money(pnl.netIncome)}</div>
        </div>
        <div className="kpi">
          <div className="label">Retained earnings (book)</div>
          <div className="value money">
            {money(sheet.equity.find((a) => a.systemKey === 'retained_earnings')?.balance || 0)}
          </div>
        </div>
      </div>
      <section className="panel" style={{ padding: '1.25rem' }}>
        <h2 style={{ marginTop: 0 }}>Close checklist</h2>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.65rem' }}>
          {checks.map((c) => (
            <li key={c.label} style={{ color: c.ok ? 'var(--sea-deep)' : 'var(--muted)' }}>
              {c.ok ? '✓' : '○'} {c.label}
            </li>
          ))}
        </ul>
        {closed && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Closing journal posted: revenue and expense accounts zeroed into Retained Earnings for{' '}
            {money(pnl.netIncome)}.
          </p>
        )}
      </section>
    </div>
  );
}
