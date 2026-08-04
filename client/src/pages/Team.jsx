import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';

export default function Team() {
  const { can, refresh } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [plan, setPlan] = useState(null);
  const [name, setName] = useState('');

  async function load() {
    const { data } = await api.get('/team');
    setTeam(data.team);
    setMembers(data.members);
    setPlan(data.plan);
    setName(data.team.name);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveTeam(e) {
    e.preventDefault();
    await api.patch('/team', { name });
    await load();
    await refresh();
  }

  async function changeRole(id, role) {
    await api.patch(`/team/members/${id}/role`, { role });
    load();
  }

  async function removeMember(id) {
    if (!confirm('Deactivate this member?')) return;
    await api.delete(`/team/members/${id}`);
    load();
  }

  async function regenInvite() {
    const { data } = await api.post('/team/invite/regenerate');
    setTeam((t) => ({ ...t, inviteCode: data.inviteCode }));
    refresh();
  }

  if (!team) return <div className="page"><p>Loading team…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Team management</h1>
          <p>Roles, seats, and invite codes for your Relay workspace.</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div className="panel panel-pad">
          <div className="section-title"><h2>Workspace</h2></div>
          <form className="form-grid" onSubmit={saveTeam}>
            <label className="field">
              Team name
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={!can('team:write')} />
            </label>
            <div className="form-row">
              <label className="field">
                Plan
                <input value={plan?.name || team.plan} disabled />
              </label>
              <label className="field">
                Seats
                <input value={`${members.filter((m) => m.isActive).length} / ${plan?.seats || '—'}`} disabled />
              </label>
            </div>
            {can('team:write') && (
              <button className="btn btn-primary" type="submit">Save changes</button>
            )}
          </form>
        </div>

        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Invite code</h2>
            {can('team:write') && (
              <button className="btn btn-secondary" type="button" onClick={regenInvite}>
                <RefreshCw size={16} /> Regenerate
              </button>
            )}
          </div>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '0.8rem' }}>
            Share this code so teammates can join during registration.
          </p>
          <div className="ai-result" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>
            {team.inviteCode}
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <div className="section-title"><h2>Members</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Title</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div className="avatar">{initials(m.name)}</div>
                    <div>
                      <strong>{m.name}</strong>
                      <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td>{m.title}</td>
                <td>
                  {can('team:write') && m.role !== 'owner' ? (
                    <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="sales">Sales Rep</option>
                    </select>
                  ) : (
                    <span className="badge badge-soft">{m.role}</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${m.isActive ? 'badge-soft' : 'badge-slate'}`}>
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {can('team:write') && m.role !== 'owner' && m.isActive && (
                    <button className="btn btn-danger" type="button" onClick={() => removeMember(m.id)}>
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
