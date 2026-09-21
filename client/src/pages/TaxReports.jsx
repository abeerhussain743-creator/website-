import { useEffect, useState } from 'react';
import { commerceApi, reportsApi } from '../api/client';
import { money } from '../utils/format';

export default function TaxReports() {
  const [summary, setSummary] = useState(null);
  const [taxes, setTaxes] = useState([]);

  useEffect(() => {
    Promise.all([reportsApi.tax(), commerceApi.taxes()]).then(([s, t]) => {
      setSummary(s);
      setTaxes(t.taxes);
    });
  }, []);

  if (!summary) return <div className="page">Loading tax reports…</div>;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Tax Reports</h1>
          <p>Sales tax collected on Shopify orders and liability on the balance sheet.</p>
        </div>
      </div>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Tax collected</div>
          <div className="value money">{money(summary.collected)}</div>
        </div>
        <div className="kpi">
          <div className="label">Tax payable balance</div>
          <div className="value money">{money(summary.liability)}</div>
        </div>
        <div className="kpi">
          <div className="label">Orders with tax</div>
          <div className="value">{summary.ordersWithTax}</div>
        </div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Tax rates</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Region</th>
                <th className="num">Rate</th>
                <th>GL Account</th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((t) => (
                <tr key={t._id}>
                  <td>{t.name}</td>
                  <td>
                    {t.country}
                    {t.state ? `-${t.state}` : ''}
                  </td>
                  <td className="num">{(t.rate * 100).toFixed(2)}%</td>
                  <td>{t.accountId?.accountName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
