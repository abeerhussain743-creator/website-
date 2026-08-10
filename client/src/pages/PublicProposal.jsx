import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { money } from '../utils/format';

export default function PublicProposal() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const [changeMessage, setChangeMessage] = useState('');
  const [done, setDone] = useState('');
  const trackedOpen = useRef(false);
  const pricingTracked = useRef(false);

  useEffect(() => {
    api
      .get(`/public/proposals/${slug}${preview ? '?preview=1' : ''}`)
      .then(({ data }) => setProposal(data.proposal))
      .catch((err) => setError(err.response?.data?.message || 'Proposal not found'));
  }, [slug, preview]);

  useEffect(() => {
    if (!proposal || preview || trackedOpen.current) return;
    if (!['sent', 'viewed', 'changes_requested', 'accepted', 'declined'].includes(proposal.status) && !preview) {
      // still allow tracking if accessible
    }
    trackedOpen.current = true;
    api.post(`/public/proposals/${slug}/events`, { type: 'opened' }).catch(() => {});

    const started = Date.now();
    const heartbeat = setInterval(() => {
      api.post(`/public/proposals/${slug}/events`, { type: 'heartbeat', seconds: 5 }).catch(() => {});
    }, 5000);

    return () => {
      clearInterval(heartbeat);
      const seconds = Math.round((Date.now() - started) / 1000);
      if (seconds > 0) {
        api.post(`/public/proposals/${slug}/events`, { type: 'heartbeat', seconds }).catch(() => {});
      }
    };
  }, [proposal, preview, slug]);

  function onPricingVisible() {
    if (preview || pricingTracked.current) return;
    pricingTracked.current = true;
    api.post(`/public/proposals/${slug}/events`, { type: 'viewed_pricing' }).catch(() => {});
  }

  async function accept() {
    await api.post(`/public/proposals/${slug}/events`, { type: 'accepted' });
    setDone(`accepted`);
    const { data } = await api.get(`/public/proposals/${slug}`);
    setProposal(data.proposal);
  }

  async function requestChanges(e) {
    e.preventDefault();
    await api.post(`/public/proposals/${slug}/events`, {
      type: 'requested_changes',
      message: changeMessage,
    });
    setDone('changes');
    const { data } = await api.get(`/public/proposals/${slug}`);
    setProposal(data.proposal);
  }

  if (error) {
    return <div className="min-h-screen grid place-items-center text-[var(--color-ink-soft)]">{error}</div>;
  }

  if (!proposal) {
    return <div className="min-h-screen grid place-items-center text-[var(--color-ink-soft)]">Loading proposal…</div>;
  }

  const templateClass = {
    modern: 'from-teal-50 via-white to-[var(--color-foam)]',
    corporate: 'from-slate-100 via-white to-slate-50',
    creative: 'from-orange-50 via-white to-amber-50',
    technical: 'from-slate-200 via-white to-cyan-50',
  }[proposal.template] || 'from-teal-50 via-white to-[var(--color-foam)]';

  return (
    <div className={`min-h-screen bg-gradient-to-b ${templateClass}`}>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <div className="animate-rise">
          <div className="text-xs uppercase tracking-[0.2em] text-teal-800/70">
            {proposal.organization?.brand?.companyName || proposal.organization?.name || 'Proposal'}
          </div>
          <h1 className="mt-3 font-display text-5xl font-800 tracking-tight">
            {proposal.client?.companyName}
          </h1>
          <p className="mt-3 text-xl text-[var(--color-ink-soft)]">{proposal.title.replace(`${proposal.client?.companyName} — `, '')}</p>
          <div className="mt-6 text-sm text-[var(--color-ink-soft)]">
            Prepared by <span className="font-medium text-[var(--color-ink)]">{proposal.owner?.name}</span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 animate-rise-delay-1">
          <div className="rounded-3xl border border-[var(--color-line)] bg-white/80 p-5" onMouseEnter={onPricingVisible}>
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">Project Investment</div>
            <div className="mt-2 font-display text-4xl font-700">{money(proposal.investment)}</div>
          </div>
          <div className="rounded-3xl border border-[var(--color-line)] bg-white/80 p-5">
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">Timeline</div>
            <div className="mt-2 font-display text-4xl font-700">{proposal.timelineDisplay}</div>
          </div>
        </div>

        <section className="mt-10 animate-rise-delay-2">
          <h2 className="font-display text-2xl font-700">Project Overview</h2>
          <p className="mt-3 leading-relaxed text-[var(--color-ink-soft)]">{proposal.content?.projectOverview}</p>
        </section>

        <section className="mt-10 animate-rise-delay-3">
          <h2 className="font-display text-2xl font-700 mb-4">Scope of Work</h2>
          <div className="space-y-3">
            {(proposal.content?.scopeOfWork || []).map((item) => (
              <div key={item.order || item.title} className="flex gap-3 rounded-2xl border border-[var(--color-line)] bg-white/70 px-4 py-3">
                <div className="text-teal-700 font-medium">✓</div>
                <div>
                  <div className="font-medium">{item.title}</div>
                  {item.description && <div className="text-sm text-[var(--color-ink-soft)] mt-1">{item.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-700 mb-4">Timeline</h2>
          <div className="space-y-3">
            {(proposal.content?.timeline || []).map((item) => (
              <div key={item.week} className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                <div className="font-medium">{item.week}</div>
                <div>
                  <div className="font-medium">{item.title}</div>
                  {item.description && <div className="text-[var(--color-ink-soft)]">{item.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {proposal.status === 'accepted' || done === 'accepted' ? (
          <div className="mt-12 rounded-3xl bg-teal-800 px-6 py-8 text-white">
            <div className="font-display text-3xl font-700">Proposal accepted</div>
            <p className="mt-2 text-teal-100">Thank you — the team will follow up with kickoff details.</p>
          </div>
        ) : (
          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={accept}
              className="rounded-xl bg-teal-700 px-6 py-3 font-medium text-white hover:bg-teal-800"
            >
              Accept Proposal
            </button>
            <details className="rounded-xl border border-[var(--color-line)] bg-white/80 px-4 py-3">
              <summary className="cursor-pointer font-medium">Request Changes</summary>
              <form onSubmit={requestChanges} className="mt-3 space-y-3">
                <textarea
                  className="w-full rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
                  rows={3}
                  value={changeMessage}
                  onChange={(e) => setChangeMessage(e.target.value)}
                  placeholder="What should we revise?"
                  required
                />
                <button className="rounded-xl bg-[var(--color-ink)] px-4 py-2 text-sm text-white">
                  Submit request
                </button>
              </form>
            </details>
          </div>
        )}

        {done === 'changes' && (
          <div className="mt-4 text-sm text-amber-800">Change request sent. The salesperson has been notified.</div>
        )}
      </div>
    </div>
  );
}
