import { useEffect, useState } from 'react';
import { commerceApi } from '../api/client';
import { money, shortDate } from '../utils/format';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    commerceApi.inventory().then((d) => {
      setInventory(d.inventory);
      setTransactions(d.transactions);
    });
  }, []);

  const value = inventory.reduce((s, i) => s + i.quantity * i.averageCost, 0);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Inventory</h1>
          <p>On-hand quantities, average cost, and inventory transactions from sales and purchases.</p>
        </div>
        <div className="kpi" style={{ minWidth: 200 }}>
          <div className="label">Inventory value</div>
          <div className="value money" style={{ fontSize: '1.5rem' }}>
            {money(value)}
          </div>
        </div>
      </div>
      <div className="split-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Stock on hand</h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th className="num">Qty</th>
                  <th className="num">Avg cost</th>
                  <th>Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((i) => (
                  <tr key={i._id}>
                    <td>{i.productId?.sku}</td>
                    <td>{i.productId?.title}</td>
                    <td className="num">{i.quantity}</td>
                    <td className="num money">{money(i.averageCost)}</td>
                    <td>{i.warehouse}</td>
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
                  <th>Type</th>
                  <th>Product</th>
                  <th className="num">Qty</th>
                  <th>Ref</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id}>
                    <td>{shortDate(t.date)}</td>
                    <td>
                      <span className="badge">{t.type}</span>
                    </td>
                    <td>{t.productId?.sku}</td>
                    <td className="num">{t.quantity}</td>
                    <td>{t.reference}</td>
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
