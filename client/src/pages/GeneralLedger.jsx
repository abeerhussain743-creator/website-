import { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import { exportCsv, money, shortDate } from '../utils/format';

export default function GeneralLedger() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    reportsApi.generalLedger().then((d) => setRows(d.rows)).catch(console.error);
  }, []);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>General Ledger</h1>
          <p>Every posted journal line across the chart of accounts.</p>
        </div>
        <button
          className="btn secondary"
          type="button"
          onClick={() =>
            exportCsv(
              'general-ledger.csv',
              rows.map((r) => ({
                date: shortDate(r.date),
                reference: r.reference,
                account: `${r.accountNumber} ${r.accountName}`,
                debit: r.debit,
                credit: r.credit,
                memo: r.memo,
              }))
            )
          }
        >
          Export CSV
        </button>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ref</th>
                <th>Account</th>
                <th>Memo</th>
                <th className="num">Debit</th>
                <th className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r._id}-${i}`}>
                  <td>{shortDate(r.date)}</td>
                  <td>{r.reference}</td>
                  <td>
                    {r.accountNumber} · {r.accountName}
                  </td>
                  <td style={{ whiteSpace: 'normal' }}>{r.memo || r.description}</td>
                  <td className="num money">{r.debit ? money(r.debit) : ''}</td>
                  <td className="num money">{r.credit ? money(r.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
