import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { money } from '../utils/format';

export default function Billing() {
  const { refresh } = useAuth();
  const [billing, setBilling] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/billing').then(({ data }) => setBilling(data));
  }, []);

  async function upgrade(planId) {
    const { data } = await api.post('/billing/upgrade', { planId });
    setMessage(data.message);
    setBilling((prev) => ({ ...prev, plan: planId }));
    refresh();
  }

  if (!billing) return <div className="text-[var(--color-ink-soft)]">Loading billing…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-700">Billing</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Current plan: <strong className="capitalize text-[var(--color-ink)]">{billing.plan}</strong>
          {billing.stripeEnabled ? '' : ' · Stripe demo mode'}
        </p>
      </div>
      {message && <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        {billing.plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-3xl border p-5 ${
              billing.plan === plan.id ? 'border-teal-700 bg-teal-50' : 'border-[var(--color-line)] bg-white/80'
            }`}
          >
            <div className="font-display text-2xl font-700">{plan.name}</div>
            <div className="mt-2 text-3xl font-display">{money(plan.price)}<span className="text-base text-[var(--color-ink-soft)]">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-ink-soft)]">
              {plan.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <button
              disabled={billing.plan === plan.id}
              onClick={() => upgrade(plan.id)}
              className="mt-5 w-full rounded-xl bg-[var(--color-ink)] px-4 py-2.5 text-sm text-white disabled:opacity-40"
            >
              {billing.plan === plan.id ? 'Current plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
