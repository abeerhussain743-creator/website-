import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { formatDateTime } from '../utils/format';

const empty = {
  title: '',
  description: '',
  location: 'Video call',
  startAt: '',
  endAt: '',
  leadId: '',
  meetingType: 'discovery',
};

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  async function load() {
    const [m, l] = await Promise.all([
      api.get('/meetings'),
      api.get('/leads'),
    ]);
    setMeetings(m.data.meetings);
    setLeads(l.data.leads);
  }

  useEffect(() => {
    load();
  }, []);

  async function createMeeting(e) {
    e.preventDefault();
    await api.post('/meetings', {
      ...form,
      leadId: form.leadId || undefined,
    });
    setOpen(false);
    setForm(empty);
    load();
  }

  async function setStatus(id, status) {
    await api.patch(`/meetings/${id}`, { status });
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Meeting scheduler</h1>
          <p>Plan discovery calls, demos, and negotiation syncs against live leads.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
          <Plus size={18} /> Schedule meeting
        </button>
      </div>

      <div className="panel panel-pad">
        <table className="table">
          <thead>
            <tr>
              <th>Meeting</th>
              <th>Lead</th>
              <th>When</th>
              <th>Type</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m._id}>
                <td>
                  <strong>{m.title}</strong>
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{m.location}</div>
                </td>
                <td>{m.lead?.name || '—'}</td>
                <td>{formatDateTime(m.startAt)}</td>
                <td style={{ textTransform: 'capitalize' }}>{m.meetingType.replace('_', ' ')}</td>
                <td>
                  <span className={`badge ${m.status === 'scheduled' ? 'badge-soft' : m.status === 'completed' ? 'badge-amber' : 'badge-slate'}`}>
                    {m.status}
                  </span>
                </td>
                <td>
                  {m.status === 'scheduled' && (
                    <button className="btn btn-secondary" type="button" onClick={() => setStatus(m._id, 'completed')}>
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meetings.length === 0 && <div className="empty">No meetings scheduled yet</div>}
      </div>

      {open && (
        <Modal title="Schedule meeting" subtitle="Attach it to a lead to keep activity history complete." onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={createMeeting}>
            <label className="field">Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <div className="form-row">
              <label className="field">Start<input type="datetime-local" required value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></label>
              <label className="field">End<input type="datetime-local" required value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></label>
            </div>
            <div className="form-row">
              <label className="field">
                Lead
                <select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
                  <option value="">None</option>
                  {leads.map((l) => <option key={l._id} value={l._id}>{l.name} — {l.company}</option>)}
                </select>
              </label>
              <label className="field">
                Type
                <select value={form.meetingType} onChange={(e) => setForm({ ...form, meetingType: e.target.value })}>
                  <option value="discovery">Discovery</option>
                  <option value="demo">Demo</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="internal">Internal</option>
                </select>
              </label>
            </div>
            <label className="field">Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
            <label className="field">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save meeting</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
