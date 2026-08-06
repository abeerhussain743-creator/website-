import { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import { exportCsv, money } from '../utils/format';

export default function ProfitLoss() {
  const [data, setData] = useState(null);

  useEffect(() => {
    reportsApi.profitLoss().then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="page">Loading P&amp;L…</div>;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Profit &amp; Loss</h1>
          <p>Revenue and expenses for the current fiscal year.</p>
        </div>
        <button
          className="btn secondary"
          type="button"
          onClick={() =>
            exportCsv('profit-loss.csv', [
              ...data.revenue.map((a) => ({ section: 'Revenue', account: a.accountName, amount: a.balance })),
              ...data.expense.map((a) => ({ section: 'Expense', account: a.accountName, amount: a.balance })),
              { section: 'Total', account: 'Net Income', amount: data.netIncome },
            ])
          }
        >
          Export CSV
        </button>
      </div>

      <div className="split-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Revenue</h2>
            <strong className="money">{money(data.totalRevenue)}</strong>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue.map((a) => (
                  <tr key={a._id}>
                    <td>
                      {a.accountNumber} · {a.accountName}
                    </td>
                    <td className="num money">{money(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Expenses</h2>
            <strong className="money">{money(data.totalExpense)}</strong>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expense.map((a) => (
                  <tr key={a._id}>
                    <td>
                      {a.accountNumber} · {a.accountName}
                    </td>
                    <td className="num money">{money(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="kpi">
        <div className="label">Net income</div>
        <div className="value money">{money(data.netIncome)}</div>
      </section>
    </div>
  );
}
