import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { money, prettyStatus, statusTone } from '../utils/format';

export default function Proposals() {
  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    api.get('/proposals').then(({ data }) => setProposals(data.proposals || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-700">Proposals</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">Draft, send, and track every client-facing proposal.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {proposals.map((p) => (
          <Link
            key={p._id}
            to={`/app/proposals/${p._id}`}
            className="rounded-3xl border border-[var(--color-line)] bg-white/80 p-5 hover:border-teal-600 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{p.client?.companyName}</div>
                <div className="text-sm text-[var(--color-ink-soft)] mt-1 line-clamp-2">{p.title}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs ${statusTone(p.status)}`}>
                {prettyStatus(p.status)}
              </span>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">Investment</div>
                <div className="font-display text-2xl font-700">{money(p.investment)}</div>
              </div>
              <div className="text-xs text-[var(--color-ink-soft)] capitalize">{p.template}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
