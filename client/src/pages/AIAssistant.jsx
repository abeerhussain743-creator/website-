import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../api/client';

export default function AIAssistant() {
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState('');
  const [tone, setTone] = useState('professional');
  const [goal, setGoal] = useState('follow_up');
  const [extraContext, setExtraContext] = useState('');
  const [email, setEmail] = useState(null);
  const [followUps, setFollowUps] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/leads').then((res) => {
      setLeads(res.data.leads);
      if (res.data.leads[0]) setLeadId(res.data.leads[0]._id);
    });
  }, []);

  async function runEmail() {
    setBusy('email');
    setError('');
    try {
      const { data } = await api.post('/ai/email', { leadId, tone, goal, extraContext });
      setEmail(data);
    } catch (err) {
      setError(err.response?.data?.message || 'AI request failed');
    } finally {
      setBusy('');
    }
  }

  async function runFollowUps() {
    setBusy('follow');
    setError('');
    try {
      const { data } = await api.post('/ai/follow-up', { leadId });
      setFollowUps(data);
    } catch (err) {
      setError(err.response?.data?.message || 'AI request failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>AI assistant</h1>
          <p>Generate emails and follow-up plans grounded in each lead&apos;s CRM context.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Email generation</h2>
            <Sparkles size={18} color="var(--teal)" />
          </div>
          <div className="form-grid">
            <label className="field">
              Lead
              <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                {leads.map((l) => (
                  <option key={l._id} value={l._id}>{l.name} — {l.company || 'No company'}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label className="field">
                Tone
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="direct">Direct</option>
                </select>
              </label>
              <label className="field">
                Goal
                <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                  <option value="intro">Intro</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="demo">Book demo</option>
                </select>
              </label>
            </div>
            <label className="field">
              Extra context
              <textarea value={extraContext} onChange={(e) => setExtraContext(e.target.value)} placeholder="Mention pricing, a case study, or recent news…" />
            </label>
            <button className="btn btn-primary" type="button" onClick={runEmail} disabled={!leadId || busy === 'email'}>
              {busy === 'email' ? 'Generating…' : 'Generate email'}
            </button>
          </div>

          {email && (
            <div style={{ marginTop: '1rem' }}>
              <div className="ai-result">
                <strong>Subject:</strong> {email.subject}{'\n\n'}{email.body}
                {'\n\n'}
                <em style={{ color: 'var(--muted)' }}>Source: {email.source} · Credits left: {email.creditsRemaining}</em>
              </div>
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Follow-up suggestions</h2>
          </div>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1rem' }}>
            Get a prioritized next-step plan for the selected lead.
          </p>
          <button className="btn btn-amber" type="button" onClick={runFollowUps} disabled={!leadId || busy === 'follow'}>
            {busy === 'follow' ? 'Analyzing…' : 'Suggest follow-ups'}
          </button>

          {followUps && (
            <div style={{ marginTop: '1.2rem' }}>
              <p style={{ fontWeight: 700, marginBottom: '0.8rem' }}>{followUps.nextBestAction}</p>
              {followUps.suggestions?.map((s, i) => (
                <div key={i} style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--line)' }}>
                  <strong>{s.action}</strong>
                  <p style={{ color: 'var(--ink-soft)', marginTop: 4, fontSize: '0.9rem' }}>{s.reason}</p>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <span className={`badge ${s.priority === 'high' ? 'badge-danger' : 'badge-amber'}`}>{s.priority}</span>
                    <span className="badge badge-slate">{s.suggestedTiming}</span>
                  </div>
                </div>
              ))}
              <p style={{ marginTop: '0.8rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Source: {followUps.source} · Credits left: {followUps.creditsRemaining}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && <p className="error-text" style={{ marginTop: '1rem' }}>{error}</p>}
    </div>
  );
}
