import { useEffect, useState } from 'react';
import { commerceApi } from '../api/client';
import { money, shortDate } from '../utils/format';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  useEffect(() => {
    commerceApi.expenses().then((d) => setExpenses(d.expenses));
  }, []);

  const total = expenses.reduce((s, e) => s + e.amount + (e.tax || 0), 0);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Expense Tracking</h1>
          <p>Vendor bills and operating costs posted to expense accounts and cash/bank.</p>
        </div>
        <div className="kpi" style={{ minWidth: 180 }}>
          <div className="label">Total tracked</div>
          <div className="value money" style={{ fontSize: '1.5rem' }}>
            {money(total)}
          </div>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Account</th>
                <th>Notes</th>
                <th>Method</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id}>
                  <td>{shortDate(e.date)}</td>
                  <td>{e.vendorId?.name || '—'}</td>
                  <td>
                    {e.accountId?.accountNumber} · {e.accountId?.accountName}
                  </td>
                  <td style={{ whiteSpace: 'normal' }}>{e.notes}</td>
                  <td>{e.paymentMethod}</td>
                  <td className="num money">{money(e.amount + (e.tax || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
