import { useEffect, useState } from 'react';
import { commerceApi } from '../api/client';
import { shortDate } from '../utils/format';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    commerceApi.audit().then((d) => setLogs(d.logs));
  }, []);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Audit Log</h1>
          <p>Immutable trail of journal posts, Shopify syncs, and financial actions.</p>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id}>
                  <td>{shortDate(l.createdAt)}</td>
                  <td>
                    <span className="badge">{l.action}</span>
                  </td>
                  <td>
                    {l.entityType} {l.entityId ? `· ${String(l.entityId).slice(-6)}` : ''}
                  </td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 420 }}>{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
