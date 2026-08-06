import { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import { money } from '../utils/format';

export default function CashFlow() {
  const [data, setData] = useState(null);
  useEffect(() => {
    reportsApi.cashFlow().then(setData).catch(console.error);
  }, []);
  if (!data) return <div className="page">Loading cash flow…</div>;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Cash Flow Statement</h1>
          <p>Operating inflows/outflows and movement across cash, bank, and Shopify clearing.</p>
        </div>
      </div>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Operating inflows</div>
          <div className="value money">{money(data.operating.inflows)}</div>
        </div>
        <div className="kpi">
          <div className="label">Operating outflows</div>
          <div className="value money">{money(data.operating.outflows)}</div>
        </div>
        <div className="kpi">
          <div className="label">Operating net</div>
          <div className="value money">{money(data.operating.net)}</div>
        </div>
        <div className="kpi">
          <div className="label">Net cash change</div>
          <div className="value money">{money(data.netCashChange)}</div>
        </div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Cash accounts activity</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Account</th>
                <th className="num">Debits</th>
                <th className="num">Credits</th>
                <th className="num">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.cashAccounts.map((a) => (
                <tr key={a._id}>
                  <td>
                    {a.accountNumber} · {a.accountName}
                  </td>
                  <td className="num money">{money(a.debit)}</td>
                  <td className="num money">{money(a.credit)}</td>
                  <td className="num money">{money(a.debit - a.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
