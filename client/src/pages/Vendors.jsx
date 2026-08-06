import { useEffect, useState } from 'react';
import { commerceApi } from '../api/client';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  useEffect(() => {
    commerceApi.vendors().then((d) => setVendors(d.vendors));
  }, []);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Vendors</h1>
          <p>Suppliers and billers with payment terms for expense tracking.</p>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Payment terms</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v._id}>
                  <td>{v.name}</td>
                  <td>{v.email || '—'}</td>
                  <td>{v.paymentTerms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
