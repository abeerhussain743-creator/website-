import { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import { exportCsv, money, shortDate } from '../utils/format';

export default function TrialBalance() {
  const [data, setData] = useState(null);
  useEffect(() => {
    reportsApi.trialBalance().then(setData).catch(console.error);
  }, []);
  if (!data) return <div className="page">Loading trial balance…</div>;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Trial Balance</h1>
          <p>As of {shortDate(data.asOf)} — verify debits equal credits.</p>
        </div>
        <button
          className="btn secondary"
          type="button"
          onClick={() =>
            exportCsv(
              'trial-balance.csv',
              data.accounts.map((a) => ({
                number: a.accountNumber,
                name: a.accountName,
                type: a.accountType,
                debit: a.debit,
                credit: a.credit,
              }))
            )
          }
        >
          Export CSV
        </button>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Accounts</h2>
          <span className={data.balanced ? 'badge' : 'badge danger'}>
            {data.balanced ? 'Balanced' : 'Out of balance'}
          </span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>No.</th>
                <th>Account</th>
                <th>Type</th>
                <th className="num">Debit</th>
                <th className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((a) => (
                <tr key={a._id}>
                  <td>{a.accountNumber}</td>
                  <td>{a.accountName}</td>
                  <td>{a.accountType}</td>
                  <td className="num money">{a.debit ? money(a.debit) : ''}</td>
                  <td className="num money">{a.credit ? money(a.credit) : ''}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3}>
                  <strong>Totals</strong>
                </td>
                <td className="num money">
                  <strong>{money(data.totalDebit)}</strong>
                </td>
                <td className="num money">
                  <strong>{money(data.totalCredit)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
