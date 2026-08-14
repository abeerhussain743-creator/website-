import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import api from '../api/client';
import { money, prettyStatus, statusTone } from '../utils/format';

export default function CallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [call, setCall] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [missingOpen, setMissingOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get(`/calls/${id}`);
    setCall(data.call);
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 1500);
    return () => clearInterval(timer);
  }, [load]);

  async function reanalyze() {
    setBusy(true);
    try {
      const { data } = await api.post(`/calls/${id}/analyze`);
      setCall(data.call);
    } catch (err) {
      setError(err.response?.data?.message || 'Analyze failed');
    } finally {
      setBusy(false);
    }
  }

  async function askQuestions() {
    const { data } = await api.post(`/calls/${id}/questions`);
    setQuestions(data.questions || []);
  }

  async function generate(force = false) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/proposals/from-call/${id}`, { force, template: 'modern' });
      navigate(`/app/proposals/${data.proposal._id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setMissingOpen(true);
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || 'Could not generate proposal');
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveAnswers(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const answers = (call.analysis?.missingInformation || []).map((item) => ({
      field: item.field,
      answer: form.get(item.field),
    }));
    const { data } = await api.patch(`/calls/${id}/missing`, { answers });
    setCall(data.call);
    setMissingOpen(false);
    generate(true);
  }

  if (!call) return <div className="text-[var(--color-ink-soft)]">Loading call…</div>;

  const analysis = call.analysis;
  const processing = call.status === 'processing';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-[var(--color-ink-soft)]">AI Call Analysis</div>
          <h1 className="font-display text-4xl font-700">{call.client?.companyName}</h1>
          <p className="mt-1 text-[var(--color-ink-soft)]">{call.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-sm ${statusTone(call.status)}`}>
            {prettyStatus(call.status)}
          </span>
          <button
            onClick={reanalyze}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
          >
            <RefreshCw size={14} /> Re-analyze
          </button>
          <button
            onClick={() => generate(false)}
            disabled={busy || !analysis || processing}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Sparkles size={14} /> Generate Proposal
          </button>
        </div>
      </div>

      {processing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="font-medium text-amber-900">AI is processing this conversation…</div>
          <div className="mt-3 h-1.5 rounded-full bg-amber-100 overflow-hidden">
            <div className="h-full w-1/2 processing-bar" />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            {error}
            {missingOpen && (
              <button className="ml-2 underline" onClick={() => generate(true)}>
                Generate anyway
              </button>
            )}
          </div>
        </div>
      )}

      {analysis && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-3xl border border-[var(--color-line)] bg-white/80 p-5 lg:col-span-2 animate-rise">
              <h2 className="font-display text-2xl font-700">Client</h2>
              <div className="mt-2 text-lg font-medium">{call.client?.companyName}</div>
              <p className="mt-3 text-[var(--color-ink-soft)] leading-relaxed">{analysis.summary}</p>

              <h3 className="mt-6 font-display text-xl font-700">Pain Points</h3>
              <div className="mt-3 space-y-2">
                {(analysis.painPoints || []).map((p) => (
                  <blockquote key={p} className="rounded-2xl bg-[var(--color-mist)] px-4 py-3 text-[var(--color-ink-soft)]">
                    {p}
                  </blockquote>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--color-line)] bg-white/80 p-5 space-y-4 animate-rise-delay-1">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">Budget</div>
                <div className="mt-1 font-display text-2xl font-700">{analysis.budget?.display}</div>
                <div className="mt-1 text-sm">
                  AI confidence: <strong>{analysis.budget?.confidence}%</strong>
                </div>
                {analysis.budget?.inferred && (
                  <div className="mt-2 text-xs text-amber-800 flex gap-1">
                    <AlertTriangle size={12} className="mt-0.5" />
                    {analysis.budget.note || 'Budget was inferred from the conversation.'}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">Timeline</div>
                <div className="mt-1 font-display text-2xl font-700">{analysis.timeline?.display}</div>
                <div className="text-sm">AI confidence: <strong>{analysis.timeline?.confidence}%</strong></div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">Decision Maker</div>
                <div className="mt-1 font-medium">
                  {analysis.decisionMaker?.name}
                  {analysis.decisionMaker?.title ? ` — ${analysis.decisionMaker.title}` : ''}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">Urgency</div>
                <div className="mt-1 font-medium">{analysis.urgency}</div>
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-[var(--color-line)] bg-white/80 p-5 animate-rise-delay-2">
            <h2 className="font-display text-2xl font-700 mb-4">Project Requirements</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[var(--color-ink-soft)]">
                  <tr>
                    <th className="pb-2 font-medium">Requirement</th>
                    <th className="pb-2 font-medium">Priority</th>
                    <th className="pb-2 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {(analysis.requirements || []).map((req) => (
                    <tr key={req.title} className="border-t border-[var(--color-line)]">
                      <td className="py-3">
                        <div className="font-medium">{req.title}</div>
                        {req.description && (
                          <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">{req.description}</div>
                        )}
                        {req.inferred && (
                          <div className="text-xs text-amber-700 mt-1">Inferred — AI isn’t 100% sure</div>
                        )}
                      </td>
                      <td className="py-3">{req.priority}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-teal-600" style={{ width: `${req.confidence}%` }} />
                          </div>
                          <span>{req.confidence}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {(analysis.missingInformation || []).length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 animate-rise-delay-3">
              <h2 className="font-display text-2xl font-700 flex items-center gap-2">
                <AlertTriangle size={20} /> Missing Information
              </h2>
              <p className="mt-2 text-sm text-amber-950/80">
                Before generating the proposal: {(analysis.missingInformation || []).filter((m) => !m.answered).length} important details are missing.
              </p>
              <ul className="mt-4 space-y-2">
                {(analysis.missingInformation || []).map((item) => (
                  <li key={item.field} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(item.answered)} readOnly className="mt-1" />
                    <span>
                      {item.field}
                      {item.answered && item.answer ? ` — ${item.answer}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={askQuestions}
                  className="rounded-xl bg-[var(--color-ink)] px-4 py-2 text-sm text-white"
                >
                  Ask AI to generate questions
                </button>
                <button
                  onClick={() => setMissingOpen(true)}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm"
                >
                  Answer missing details
                </button>
              </div>
              {questions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {questions.map((q) => (
                    <div key={q} className="rounded-xl bg-white px-3 py-2 text-sm">
                      “{q}”
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {call.proposal && (
            <Link
              to={`/app/proposals/${call.proposal._id || call.proposal}`}
              className="inline-flex rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm hover:bg-teal-50"
            >
              Open existing proposal →
            </Link>
          )}
        </>
      )}

      {missingOpen && analysis && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4">
          <form onSubmit={saveAnswers} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-display text-2xl font-700">Fill missing details</h3>
            {(analysis.missingInformation || []).map((item) => (
              <label key={item.field} className="block text-sm">
                <span>{item.question || item.field}</span>
                <input
                  name={item.field}
                  defaultValue={item.answer || ''}
                  className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
                />
              </label>
            ))}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMissingOpen(false)} className="rounded-xl px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-teal-700 px-4 py-2 text-sm text-white">
                Save & generate
              </button>
            </div>
          </form>
        </div>
      )}

      {!analysis && !processing && (
        <div className="rounded-3xl border border-[var(--color-line)] bg-white/80 p-6">
          <p className="text-[var(--color-ink-soft)]">No analysis yet.</p>
          <button onClick={reanalyze} className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-white text-sm">
            Run AI analysis
          </button>
        </div>
      )}

      {analysis?.budget && (
        <div className="text-xs text-[var(--color-ink-soft)]">
          Suggested mid-range investment around {money(((analysis.budget.min || 0) + (analysis.budget.max || 0)) / 2)}.
        </div>
      )}
    </div>
  );
}
