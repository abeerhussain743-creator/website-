import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    teamName: '',
    inviteCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create your Relay workspace</h1>
        <p className="sub">Start free, invite your team, and put AI on follow-ups.</p>

        <div className="form-grid">
          <label className="field">
            Your name
            <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </label>
          <label className="field">
            Work email
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </label>
          <label className="field">
            Password
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} minLength={6} required />
          </label>
          <label className="field">
            Team name
            <input value={form.teamName} onChange={(e) => set('teamName', e.target.value)} placeholder="Acme Sales" />
          </label>
          <label className="field">
            Invite code (optional)
            <input value={form.inviteCode} onChange={(e) => set('inviteCode', e.target.value)} placeholder="Join an existing team" />
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading} type="submit">
          {loading ? 'Creating…' : 'Create workspace'}
        </button>

        <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--teal-deep)', fontWeight: 700 }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
