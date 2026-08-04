import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Billing() {
  const { can, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [aiCreditsUsed, setAiCreditsUsed] = useState(0);
  const [aiCreditsLimit, setAiCreditsLimit] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    const { data } = await api.get('/billing/plans');
    setPlans(data.plans);
    setCurrentPlan(data.currentPlan);
    setStripeConfigured(data.stripeConfigured);
    setAiCreditsUsed(data.aiCreditsUsed);
    setAiCreditsLimit(data.aiCreditsLimit);
  }

  useEffect(() => {
    load();
    if (searchParams.get('success')) {
      setMessage('Subscription updated successfully.');
      refresh();
    }
    if (searchParams.get('canceled')) {
      setMessage('Checkout canceled.');
    }
  }, []);

  async function upgrade(planId) {
    if (!can('billing:write')) {
      setMessage('You need billing permissions to change plans.');
      return;
    }
    setBusy(planId);
    try {
      const { data } = await api.post('/billing/checkout', { planId });
      if (data.demo) {
        setMessage(`Upgraded to ${planId} in demo mode (Stripe keys not configured).`);
        await load();
        await refresh();
        if (data.url?.startsWith('http') && !data.demo) {
          window.location.href = data.url;
        }
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Checkout failed');
    } finally {
      setBusy('');
    }
  }

  async function downgrade() {
    setBusy('free');
    await api.post('/billing/downgrade');
    setMessage('Moved to Free plan.');
    await load();
    await refresh();
    setBusy('');
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Subscription plans</h1>
          <p>
            AI credits used: {aiCreditsUsed} / {aiCreditsLimit}
            {!stripeConfigured && ' · Demo billing (instant upgrades without Stripe keys)'}
          </p>
        </div>
      </div>

      {message && (
        <div className="panel panel-pad" style={{ marginBottom: '1rem', background: 'var(--teal-soft)', borderColor: '#b7e4e0' }}>
          {message}
        </div>
      )}

      <div className="plan-grid">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div key={plan.id} className={`plan-card ${isCurrent ? 'current' : ''}`}>
              <div>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>{plan.name}</strong>
                {isCurrent && <span className="badge badge-soft" style={{ marginLeft: 8 }}>Current</span>}
              </div>
              <div className="price">
                ${plan.price}<span>/mo</span>
              </div>
              <ul>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Check size={16} color="var(--teal-deep)" style={{ marginTop: 2 }} />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.id === 'free' ? (
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={isCurrent || busy === 'free' || !can('billing:write')}
                  onClick={downgrade}
                >
                  {isCurrent ? 'Current plan' : 'Downgrade'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={isCurrent || busy === plan.id}
                  onClick={() => upgrade(plan.id)}
                >
                  {isCurrent ? 'Current plan' : busy === plan.id ? 'Processing…' : 'Upgrade'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
