import { useEffect, useState } from 'react';
import { commerceApi } from '../api/client';
import { money, shortDate } from '../utils/format';

export default function BankReconciliation() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  async function load() {
    const [a, t] = await Promise.all([commerceApi.bankAccounts(), commerceApi.bankTransactions()]);
    setAccounts(a.accounts);
    setTransactions(t.transactions);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function match(id) {
    await commerceApi.matchBank(id, {});
    await load();
  }

  const unmatched = transactions.filter((t) => !t.matched).length;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Bank Reconciliation</h1>
          <p>Match bank deposits to journal entries from Shopify payouts and expenses.</p>
        </div>
        <span className={unmatched ? 'badge warn' : 'badge'}>{unmatched} unmatched</span>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Bank accounts</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Account</th>
                <th>Currency</th>
                <th className="num">Opening</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a._id}>
                  <td>{a.bankName}</td>
                  <td>{a.accountNumber}</td>
                  <td>{a.currency}</td>
                  <td className="num money">{money(a.openingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Transactions</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th>Matched</th>
                <th>Journal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id}>
                  <td>{shortDate(t.date)}</td>
                  <td style={{ whiteSpace: 'normal' }}>{t.description}</td>
                  <td className="num money">{money(t.amount)}</td>
                  <td>
                    <span className={t.matched ? 'badge' : 'badge warn'}>
                      {t.matched ? 'Matched' : 'Open'}
                    </span>
                  </td>
                  <td>{t.journalEntryId?.reference || '—'}</td>
                  <td>
                    {!t.matched && (
                      <button className="btn secondary" type="button" onClick={() => match(t._id)}>
                        Match
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
