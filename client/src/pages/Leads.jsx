import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { formatCurrency, STAGE_COLORS, STAGE_LABELS } from '../utils/format';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  title: '',
  source: 'website',
  stage: 'new',
  value: 0,
  priority: 'medium',
  notes: '',
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    const params = {};
    if (search) params.search = search;
    if (stage) params.stage = stage;
    const { data } = await api.get('/leads', { params });
    setLeads(data.leads);
  }

  useEffect(() => {
    load();
  }, [stage]);

  async function createLead(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/leads', { ...form, value: Number(form.value) || 0 });
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lead');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Lead management</h1>
          <p>Create, qualify, and track every opportunity across your team.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
          <Plus size={18} /> Add lead
        </button>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--muted)' }} />
            <input
              style={{ paddingLeft: '2.2rem' }}
              placeholder="Search name, email, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All stages</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button className="btn btn-secondary" type="button" onClick={load}>Search</button>
        </div>
      </div>

      <div className="panel panel-pad">
        <table className="table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Company</th>
              <th>Stage</th>
              <th>Priority</th>
              <th>Owner</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id}>
                <td>
                  <Link to={`/leads/${lead._id}`} style={{ fontWeight: 700 }}>{lead.name}</Link>
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{lead.email}</div>
                </td>
                <td>{lead.company || '—'}</td>
                <td>
                  <span className="badge" style={{ background: `${STAGE_COLORS[lead.stage]}22`, color: STAGE_COLORS[lead.stage] }}>
                    {STAGE_LABELS[lead.stage]}
                  </span>
                </td>
                <td>
                  <span className={`badge ${lead.priority === 'high' ? 'badge-danger' : lead.priority === 'medium' ? 'badge-amber' : 'badge-slate'}`}>
                    {lead.priority}
                  </span>
                </td>
                <td>{lead.owner?.name || '—'}</td>
                <td>{formatCurrency(lead.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && <div className="empty">No leads match your filters</div>}
      </div>

      {open && (
        <Modal title="Add lead" subtitle="Capture a new opportunity for your pipeline." onClose={() => setOpen(false)}>
          <form onSubmit={createLead} className="form-grid">
            <div className="form-row">
              <label className="field">Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="field">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            </div>
            <div className="form-row">
              <label className="field">Company<input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
              <label className="field">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            </div>
            <div className="form-row">
              <label className="field">Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className="field">Value<input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label>
            </div>
            <div className="form-row">
              <label className="field">
                Source
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="cold_outreach">Cold outreach</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="event">Event</option>
                  <option value="inbound">Inbound</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                Priority
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label className="field">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create lead</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
