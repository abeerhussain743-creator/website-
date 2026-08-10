import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Eye, Send, Sparkles } from 'lucide-react';
import api from '../api/client';
import { money, prettyStatus, statusTone } from '../utils/format';

export default function ProposalEditor() {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [followUp, setFollowUp] = useState(null);
  const [tone, setTone] = useState('professional');
  const [day, setDay] = useState(2);
  const [emailPreview, setEmailPreview] = useState(null);

  async function load() {
    const [{ data: p }, { data: t }] = await Promise.all([
      api.get(`/proposals/${id}`),
      api.get(`/proposals/${id}/tracking`),
    ]);
    setProposal(p.proposal);
    setTracking(t);
  }

  useEffect(() => {
    load();
  }, [id]);

  const selectedPackage = useMemo(
    () => proposal?.packages?.find((pkg) => pkg.id === proposal.selectedPackageId),
    [proposal]
  );

  function updateContent(key, value) {
    setProposal((prev) => ({
      ...prev,
      content: { ...prev.content, [key]: value },
    }));
  }

  function updateScope(index, field, value) {
    setProposal((prev) => {
      const scopeOfWork = [...(prev.content.scopeOfWork || [])];
      scopeOfWork[index] = { ...scopeOfWork[index], [field]: value };
      return { ...prev, content: { ...prev.content, scopeOfWork } };
    });
  }

  function updateTimeline(index, field, value) {
    setProposal((prev) => {
      const timeline = [...(prev.content.timeline || [])];
      timeline[index] = { ...timeline[index], [field]: value };
      return { ...prev, content: { ...prev.content, timeline } };
    });
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await api.patch(`/proposals/${id}`, {
        title: proposal.title,
        template: proposal.template,
        content: proposal.content,
        packages: proposal.packages,
        selectedPackageId: proposal.selectedPackageId,
        investment: proposal.investment,
        timelineDisplay: proposal.timelineDisplay,
      });
      setProposal(data.proposal);
      setMessage('Saved');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    await save();
    const { data } = await api.post(`/proposals/${id}/send`);
    setProposal(data.proposal);
    setEmailPreview(data.emailPreview);
    setMessage(`Sent — public link ready`);
    load();
  }

  async function createFollowUp() {
    const { data } = await api.post(`/proposals/${id}/follow-up`, { tone, day });
    setFollowUp(data.followUp);
  }

  if (!proposal) return <div className="text-[var(--color-ink-soft)]">Loading proposal…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-[var(--color-ink-soft)]">Proposal Editor</div>
          <h1 className="font-display text-4xl font-700">{proposal.client?.companyName}</h1>
          <p className="mt-1 text-[var(--color-ink-soft)]">{proposal.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-sm ${statusTone(proposal.status)}`}>
            {prettyStatus(proposal.status)}
          </span>
          <button onClick={save} disabled={saving} className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link
            to={`/p/${proposal.slug}?preview=1`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm"
          >
            <Eye size={14} /> Preview
          </Link>
          <a
            href={`/api/proposals/${proposal._id}/pdf`}
            onClick={(e) => {
              e.preventDefault();
              api.get(`/proposals/${proposal._id}/pdf`, { responseType: 'blob' }).then((res) => {
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${proposal.slug}.pdf`;
                a.click();
              });
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm"
          >
            <Download size={14} /> PDF
          </a>
          <button onClick={send} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white">
            <Send size={14} /> Send
          </button>
        </div>
      </div>

      {message && <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-[var(--color-line)] bg-white/85 p-5 space-y-4">
            <label className="block text-sm">
              Title
              <input
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
                value={proposal.title}
                onChange={(e) => setProposal((p) => ({ ...p, title: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              Template
              <select
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2 capitalize"
                value={proposal.template}
                onChange={(e) => setProposal((p) => ({ ...p, template: e.target.value }))}
              >
                {['modern', 'corporate', 'creative', 'technical'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Project Overview
              <textarea
                className="mt-1 min-h-28 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
                value={proposal.content?.projectOverview || ''}
                onChange={(e) => updateContent('projectOverview', e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-3xl border border-[var(--color-line)] bg-white/85 p-5">
            <h2 className="font-display text-2xl font-700 mb-4">Scope of Work</h2>
            <div className="space-y-3">
              {(proposal.content?.scopeOfWork || []).map((item, index) => (
                <div key={item.order || index} className="grid gap-2 sm:grid-cols-[80px_1fr]">
                  <input
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
                    value={item.title}
                    onChange={(e) => updateScope(index, 'title', e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
                    value={item.description || ''}
                    onChange={(e) => updateScope(index, 'description', e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--color-line)] bg-white/85 p-5">
            <h2 className="font-display text-2xl font-700 mb-4">Timeline</h2>
            <div className="space-y-3">
              {(proposal.content?.timeline || []).map((item, index) => (
                <div key={`${item.week}-${index}`} className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <input
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
                    value={item.week}
                    onChange={(e) => updateTimeline(index, 'week', e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
                    value={`${item.title}${item.description ? ` — ${item.description}` : ''}`}
                    onChange={(e) => {
                      const [title, ...rest] = e.target.value.split(' — ');
                      updateTimeline(index, 'title', title);
                      updateTimeline(index, 'description', rest.join(' — '));
                    }}
                  />
                </div>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              Timeline display
              <input
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
                value={proposal.timelineDisplay || ''}
                onChange={(e) => setProposal((p) => ({ ...p, timelineDisplay: e.target.value }))}
              />
            </label>
          </section>

          <section className="rounded-3xl border border-[var(--color-line)] bg-white/85 p-5">
            <h2 className="font-display text-2xl font-700 mb-2">Smart Pricing</h2>
            <p className="text-sm text-[var(--color-ink-soft)] mb-4">
              Recommended package: <strong>{selectedPackage?.name}</strong> — {money(selectedPackage?.price || proposal.investment)}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {(proposal.packages || []).map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() =>
                    setProposal((p) => ({
                      ...p,
                      selectedPackageId: pkg.id,
                      investment: pkg.price,
                    }))
                  }
                  className={`rounded-2xl border p-4 text-left ${
                    proposal.selectedPackageId === pkg.id
                      ? 'border-teal-700 bg-teal-50'
                      : 'border-[var(--color-line)] bg-white'
                  }`}
                >
                  <div className="text-sm text-[var(--color-ink-soft)]">{pkg.name}</div>
                  <div className="font-display text-2xl font-700 mt-1">{money(pkg.price)}</div>
                  <div className="text-xs mt-2 text-[var(--color-ink-soft)]">{pkg.description}</div>
                  {pkg.recommended && <div className="mt-3 text-xs font-medium text-teal-800">Recommended</div>}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              Pricing notes
              <textarea
                className="mt-1 min-h-20 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
                value={proposal.content?.pricingNotes || ''}
                onChange={(e) => updateContent('pricingNotes', e.target.value)}
              />
            </label>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-[var(--color-line)] bg-white/85 p-5">
            <h2 className="font-display text-xl font-700">Tracking</h2>
            <div className="mt-3 text-sm text-[var(--color-ink-soft)]">
              Total view time: <strong className="text-[var(--color-ink)]">{tracking?.totalViewTime || '0m 0s'}</strong>
            </div>
            <div className="mt-4 space-y-0">
              {(tracking?.events || []).slice().reverse().map((event, idx) => (
                <div key={`${event.type}-${idx}`} className="relative pl-5 pb-4">
                  <div className="absolute left-1 top-1.5 h-full w-px bg-[var(--color-line)]" />
                  <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-teal-700" />
                  <div className="text-sm font-medium">{event.label}</div>
                  <div className="text-xs text-[var(--color-ink-soft)]">
                    {event.at ? new Date(event.at).toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>
            {['sent', 'viewed', 'changes_requested'].includes(proposal.status) && (
              <Link to={`/p/${proposal.slug}`} target="_blank" className="mt-2 inline-block text-sm text-teal-800 underline">
                Open client page
              </Link>
            )}
          </section>

          <section className="rounded-3xl border border-[var(--color-line)] bg-white/85 p-5">
            <h2 className="font-display text-xl font-700 flex items-center gap-2">
              <Sparkles size={16} /> AI Follow-Up
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-sm">
                Tone
                <select className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-2 py-2" value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="direct">Direct</option>
                </select>
              </label>
              <label className="text-sm">
                Day
                <select className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-2 py-2" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                  <option value={2}>Day 2</option>
                  <option value={5}>Day 5</option>
                  <option value={10}>Day 10</option>
                </select>
              </label>
            </div>
            <button onClick={createFollowUp} className="mt-3 w-full rounded-xl bg-[var(--color-ink)] px-3 py-2 text-sm text-white">
              Generate Follow-up
            </button>
            {followUp && (
              <div className="mt-3 rounded-2xl bg-[var(--color-mist)] p-3 text-sm">
                <div className="font-medium">{followUp.subject}</div>
                <p className="mt-2 whitespace-pre-wrap text-[var(--color-ink-soft)]">{followUp.body}</p>
              </div>
            )}
          </section>

          {emailPreview && (
            <section className="rounded-3xl border border-[var(--color-line)] bg-teal-50 p-5 text-sm">
              <div className="font-medium">Email preview</div>
              <div className="mt-2 text-[var(--color-ink-soft)]">To: {emailPreview.to}</div>
              <div className="text-[var(--color-ink-soft)]">Subject: {emailPreview.subject}</div>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-[var(--color-ink)]">{emailPreview.body}</pre>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
