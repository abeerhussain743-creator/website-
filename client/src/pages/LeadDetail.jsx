import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Trash2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime, STAGE_LABELS } from '../utils/format';

export default function LeadDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [note, setNote] = useState('');
  const [aiEmail, setAiEmail] = useState(null);
  const [followUps, setFollowUps] = useState(null);
  const [busy, setBusy] = useState('');

  async function load() {
    const { data } = await api.get(`/leads/${id}`);
    setLead(data.lead);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save(updates) {
    const { data } = await api.patch(`/leads/${id}`, updates);
    setLead(data.lead);
  }

  async function addNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    const { data } = await api.post(`/leads/${id}/activities`, { type: 'note', content: note });
    setLead(data.lead);
    setNote('');
  }

  async function generateEmail() {
    setBusy('email');
    try {
      const { data } = await api.post('/ai/email', { leadId: id, tone: 'professional', goal: 'follow_up' });
      setAiEmail(data);
      load();
    } finally {
      setBusy('');
    }
  }

  async function generateFollowUps() {
    setBusy('follow');
    try {
      const { data } = await api.post('/ai/follow-up', { leadId: id });
      setFollowUps(data);
      load();
    } finally {
      setBusy('');
    }
  }

  async function remove() {
    if (!confirm('Delete this lead?')) return;
    await api.delete(`/leads/${id}`);
    navigate('/leads');
  }

  if (!lead) return <div className="page"><p>Loading lead…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/leads" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', marginBottom: 8 }}>
            <ArrowLeft size={16} /> Back to leads
          </Link>
          <h1>{lead.name}</h1>
          <p>{lead.title}{lead.company ? ` at ${lead.company}` : ''} · {formatCurrency(lead.value)}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-amber" type="button" onClick={generateEmail} disabled={busy === 'email'}>
            <Sparkles size={16} /> {busy === 'email' ? 'Writing…' : 'AI email'}
          </button>
          {can('leads:delete') && (
            <button className="btn btn-danger" type="button" onClick={remove}>
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel-pad">
          <div className="section-title"><h2>Details</h2></div>
          <div className="form-grid">
            <div className="form-row">
              <label className="field">Email<input value={lead.email || ''} onChange={(e) => setLead({ ...lead, email: e.target.value })} onBlur={() => save({ email: lead.email })} /></label>
              <label className="field">Phone<input value={lead.phone || ''} onChange={(e) => setLead({ ...lead, phone: e.target.value })} onBlur={() => save({ phone: lead.phone })} /></label>
            </div>
            <div className="form-row">
              <label className="field">
                Stage
                <select value={lead.stage} onChange={(e) => { setLead({ ...lead, stage: e.target.value }); save({ stage: e.target.value }); }}>
                  {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="field">
                Priority
                <select value={lead.priority} onChange={(e) => { setLead({ ...lead, priority: e.target.value }); save({ priority: e.target.value }); }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label className="field">Value<input type="number" value={lead.value} onChange={(e) => setLead({ ...lead, value: Number(e.target.value) })} onBlur={() => save({ value: lead.value })} /></label>
              <label className="field">Probability<input type="number" value={lead.probability} onChange={(e) => setLead({ ...lead, probability: Number(e.target.value) })} onBlur={() => save({ probability: lead.probability })} /></label>
            </div>
            <label className="field">Notes<textarea value={lead.notes || ''} onChange={(e) => setLead({ ...lead, notes: e.target.value })} onBlur={() => save({ notes: lead.notes })} /></label>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-title">
            <h2>AI follow-ups</h2>
            <button className="btn btn-secondary" type="button" onClick={generateFollowUps} disabled={busy === 'follow'}>
              {busy === 'follow' ? 'Thinking…' : 'Suggest'}
            </button>
          </div>
          {followUps ? (
            <div>
              <p style={{ marginBottom: '0.8rem', fontWeight: 600 }}>{followUps.nextBestAction}</p>
              {followUps.suggestions?.map((s, i) => (
                <div key={i} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--line)' }}>
                  <strong>{s.action}</strong>
                  <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', marginTop: 4 }}>{s.reason}</p>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${s.priority === 'high' ? 'badge-danger' : 'badge-amber'}`}>{s.priority}</span>
                    <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: '0.8rem' }}>{s.suggestedTiming}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Generate AI suggestions based on this lead&apos;s stage and history.</div>
          )}

          {aiEmail && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Draft email</h3>
              <div className="ai-result">
                <strong>Subject:</strong> {aiEmail.subject}{'\n\n'}{aiEmail.body}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginTop: '1rem' }}>
        <div className="section-title"><h2>Activity</h2></div>
        <form onSubmit={addNote} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
          <input placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
        {[...(lead.activities || [])].reverse().map((a, i) => (
          <div key={a._id || i} style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <strong style={{ textTransform: 'capitalize' }}>{a.type}</strong>
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{formatDateTime(a.createdAt)}</span>
            </div>
            <p style={{ color: 'var(--ink-soft)', marginTop: 4 }}>{a.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
