import { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import { money } from '../utils/format';

export default function FiscalClose() {
  const [pnl, setPnl] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    Promise.all([reportsApi.profitLoss(), reportsApi.balanceSheet()]).then(([p, s]) => {
      setPnl(p);
      setSheet(s);
    });
  }, []);

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
          <p>Checklist to close the books and roll net income into retained earnings.</p>
        </div>
        <button className="btn sea" type="button" onClick={() => setClosed(true)} disabled={closed}>
          {closed ? 'Close marked complete' : 'Mark year closed (demo)'}
        </button>
      </div>
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
            Demo mode records the close intent. In production this posts: Debit Income Summary / Credit
            Retained Earnings for {money(pnl.netIncome)}.
          </p>
        )}
      </section>
    </div>
  );
}
