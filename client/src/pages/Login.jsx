import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@relay.crm');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 13a8 8 0 0 1 16 0" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="6" cy="15" r="1.6" fill="#F5A623" />
              <circle cx="12" cy="16" r="1.6" fill="white" />
              <circle cx="18" cy="15" r="1.6" fill="#D9F3F1" />
            </svg>
          </div>
          <div className="brand-text">
            <strong style={{ color: 'var(--ink)' }}>Relay</strong>
            <span style={{ color: 'var(--muted)' }}>Sign in</span>
          </div>
        </div>
        <h1>Welcome back</h1>
        <p className="sub">Access your sales workspace and keep deals moving.</p>

        <div className="demo-box">
          Demo: <strong>demo@relay.crm</strong> / <strong>demo1234</strong>
        </div>

        <div className="form-grid">
          <label className="field">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="field">
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading} type="submit">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          New here? <Link to="/register" style={{ color: 'var(--teal-deep)', fontWeight: 700 }}>Create a workspace</Link>
        </p>
      </form>
    </div>
  );
}
