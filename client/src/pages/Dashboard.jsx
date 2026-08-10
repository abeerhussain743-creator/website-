import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import api from '../api/client';
import { greeting, money, prettyStatus, statusTone } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(({ data: d }) => setData(d));
  }, []);

  if (!data) {
    return <div className="text-[var(--color-ink-soft)]">Loading dashboard…</div>;
  }

  const metrics = [
    ['Pipeline Value', money(data.metrics.pipelineValue)],
    ['Proposals Sent', data.metrics.proposalsSent],
    ['Awaiting Response', data.metrics.awaitingResponse],
    ['Won Deals', data.metrics.wonDeals],
    ['Conversion Rate', `${data.metrics.conversionRate}%`],
  ];

  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <h1 className="font-display text-4xl font-700 tracking-tight">
          {greeting()}, {data.greetingName}
        </h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Your sales calls, AI extractions requirements, and proposal pipeline — in one place.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 animate-rise-delay-1">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-[var(--color-line)] bg-white/75 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">{label}</div>
            <div className="mt-2 font-display text-3xl font-700">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-[var(--color-line)] bg-white/75 p-5 animate-rise-delay-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-700">Recent Calls</h2>
            <Link to="/app/upload" className="text-sm text-teal-800 hover:underline">
              Upload call
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {data.recentCalls.map((call) => (
              <Link
                key={call.id}
                to={`/app/calls/${call.id}`}
                className="flex items-center justify-between gap-4 py-3 hover:bg-teal-50/50 px-2 rounded-xl"
              >
                <div>
                  <div className="font-medium">{call.companyName}</div>
                  <div className="text-sm text-[var(--color-ink-soft)]">{call.title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${statusTone(call.status)}`}>
                    {prettyStatus(call.status)}
                  </span>
                  <ArrowUpRight size={16} className="text-[var(--color-ink-soft)]" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--color-line)] bg-white/75 p-5 animate-rise-delay-3">
          <h2 className="font-display text-2xl font-700 mb-4">Tracking pulse</h2>
          <div className="space-y-3">
            {data.recentActivity.length === 0 && (
              <p className="text-sm text-[var(--color-ink-soft)]">Proposal activity will appear here.</p>
            )}
            {data.recentActivity.map((item, idx) => (
              <div key={`${item.proposalId}-${idx}`} className="rounded-2xl bg-[var(--color-mist)] px-3 py-3">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-[var(--color-ink-soft)] mt-1">{item.title}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-teal-800 text-white p-4">
            <div className="text-sm text-teal-100">Won value</div>
            <div className="font-display text-3xl font-700 mt-1">{money(data.metrics.wonValue)}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
