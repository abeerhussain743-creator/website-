import { useEffect, useState } from 'react';
import { accountsApi } from '../api/client';

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    Promise.all([accountsApi.list(), accountsApi.journal()]).then(([a, j]) => {
      setAccounts(a.accounts);
      setEntries(j.entries);
    });
  }, []);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Chart of Accounts</h1>
          <p>Asset, Liability, Equity, Revenue, and Expense accounts powering Meridian automation.</p>
        </div>
      </div>
      <div className="split-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Accounts</h2>
            <span className="badge">{accounts.length}</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>System</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a._id}>
                    <td>{a.accountNumber}</td>
                    <td>{a.accountName}</td>
                    <td>{a.accountType}</td>
                    <td>{a.systemKey ? <span className="badge">{a.systemKey}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Journal entries</h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Description</th>
                  <th>Source</th>
                  <th>Lines</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e._id}>
                    <td>{e.reference}</td>
                    <td style={{ whiteSpace: 'normal' }}>{e.description}</td>
                    <td>
                      <span className="badge">{e.sourceType}</span>
                    </td>
                    <td>{e.lines?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
