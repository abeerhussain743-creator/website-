import { useEffect, useState } from 'react';
import { commerceApi } from '../api/client';
import { money, shortDate } from '../utils/format';

export default function ShopifySales() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const [o, p] = await Promise.all([commerceApi.orders(), commerceApi.payments()]);
    setOrders(o.orders);
    setPayments(p.payments);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function sync() {
    const res = await commerceApi.syncDemo();
    setMsg(res.message);
    await load();
  }

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Shopify Sales</h1>
          <p>Orders sync into invoices, payments, and balanced journal entries.</p>
        </div>
        <button className="btn sea" type="button" onClick={sync}>
          Sync demo order
        </button>
      </div>
      {msg && <p className="badge">{msg}</p>}
      <section className="panel">
        <div className="panel-head">
          <h2>Orders</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Shipping</th>
                <th>Fee</th>
                <th>COGS</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td>{o.orderNumber}</td>
                  <td>{o.customerId?.name || 'Guest'}</td>
                  <td className="money">{money(o.subtotal)}</td>
                  <td className="money">{money(o.tax)}</td>
                  <td className="money">{money(o.shipping)}</td>
                  <td className="money">{money(o.shopifyFee)}</td>
                  <td className="money">{money(o.costOfGoods)}</td>
                  <td className="num money">{money(o.total)}</td>
                  <td>
                    <span className="badge">{o.financialStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Payments</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order</th>
                <th>Gateway</th>
                <th>Txn</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>{shortDate(p.paymentDate)}</td>
                  <td>{p.orderId?.orderNumber || '—'}</td>
                  <td>{p.gateway}</td>
                  <td>{p.transactionId}</td>
                  <td className="num money">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
