import { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import { exportCsv, money, shortDate } from '../utils/format';

function AccountTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Account</th>
            <th className="num">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((a) => a.balance !== 0)
            .map((a) => (
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
  );
}

export default function BalanceSheet() {
  const [data, setData] = useState(null);
  useEffect(() => {
    reportsApi.balanceSheet().then(setData).catch(console.error);
  }, []);
  if (!data) return <div className="page">Loading balance sheet…</div>;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Balance Sheet</h1>
          <p>As of {shortDate(data.asOf)} · Assets = Liabilities + Equity</p>
        </div>
        <button
          className="btn secondary"
          type="button"
          onClick={() =>
            exportCsv('balance-sheet.csv', [
              ...data.assets.map((a) => ({ section: 'Asset', account: a.accountName, balance: a.balance })),
              ...data.liabilities.map((a) => ({
                section: 'Liability',
                account: a.accountName,
                balance: a.balance,
              })),
              ...data.equity.map((a) => ({ section: 'Equity', account: a.accountName, balance: a.balance })),
              { section: 'Equity', account: 'Net Income YTD', balance: data.netIncome },
            ])
          }
        >
          Export CSV
        </button>
      </div>

      <div className="split-3">
        <section className="panel">
          <div className="panel-head">
            <h2>Assets</h2>
            <strong className="money">{money(data.totalAssets)}</strong>
          </div>
          <AccountTable rows={data.assets} />
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Liabilities</h2>
            <strong className="money">{money(data.totalLiabilities)}</strong>
          </div>
          <AccountTable rows={data.liabilities} />
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Equity</h2>
            <strong className="money">{money(data.totalEquity)}</strong>
          </div>
          <AccountTable rows={data.equity} />
          <div className="table-wrap">
            <table className="data">
              <tbody>
                <tr>
                  <td>Net income YTD</td>
                  <td className="num money">{money(data.netIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className={data.balanced ? 'badge' : 'badge danger'} style={{ width: 'fit-content' }}>
        {data.balanced ? 'Statement balances' : 'Out of balance — review postings'}
      </p>
    </div>
  );
}
