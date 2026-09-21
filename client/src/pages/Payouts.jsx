import { useEffect, useState } from 'react';
import { commerceApi } from '../api/client';
import { money, shortDate } from '../utils/format';

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  useEffect(() => {
    commerceApi.payouts().then((d) => setPayouts(d.payouts));
  }, []);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Shopify Payout Reconciliation</h1>
          <p>
            Payouts debit Bank and credit Shopify Clearing — reconciling fees, refunds, and net deposits.
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Payout ID</th>
                <th>Bank</th>
                <th className="num">Gross</th>
                <th className="num">Refunds</th>
                <th className="num">Fees</th>
                <th className="num">Net</th>
                <th>Deposit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p._id}>
                  <td>{p.shopifyPayoutId}</td>
                  <td>
                    {p.bankAccount?.bankName} {p.bankAccount?.accountNumber}
                  </td>
                  <td className="num money">{money(p.grossSales)}</td>
                  <td className="num money">{money(p.refunds)}</td>
                  <td className="num money">{money(p.fees)}</td>
                  <td className="num money">{money(p.netAmount)}</td>
                  <td>{shortDate(p.depositDate)}</td>
                  <td>
                    <span className="badge">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel" style={{ padding: '1.2rem' }}>
        <h3 style={{ marginTop: 0 }}>Example posting (order $172, fee $5)</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Sale clears at $172, fee reduces clearing by $5, payout deposits $167 to bank.
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Account</th>
                <th className="num">Debit</th>
                <th className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Shopify Clearing</td>
                <td className="num">172</td>
                <td className="num" />
              </tr>
              <tr>
                <td>Sales / Shipping / Tax</td>
                <td className="num" />
                <td className="num">172</td>
              </tr>
              <tr>
                <td>Merchant Fees Expense</td>
                <td className="num">5</td>
                <td className="num" />
              </tr>
              <tr>
                <td>Shopify Clearing</td>
                <td className="num" />
                <td className="num">5</td>
              </tr>
              <tr>
                <td>Bank (on payout)</td>
                <td className="num">167</td>
                <td className="num" />
              </tr>
              <tr>
                <td>Shopify Clearing</td>
                <td className="num" />
                <td className="num">167</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
