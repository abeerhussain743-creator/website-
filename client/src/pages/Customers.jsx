import { useEffect, useState } from 'react';
import { commerceApi } from '../api/client';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  useEffect(() => {
    commerceApi.customers().then((d) => setCustomers(d.customers));
  }, []);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Customers</h1>
          <p>Shopify customer records linked to orders and receivables.</p>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Country</th>
                <th>Shopify ID</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.country}</td>
                  <td>{c.shopifyCustomerId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
