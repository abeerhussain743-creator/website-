import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: 'demo@meridian.books',
    password: 'demo1234',
    companyName: '',
  });

  if (user) return <Navigate to="/app" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <Link to="/" className="brand-mark">
          <span className="brand-glyph" />
          Meridian
        </Link>
        <h1>{mode === 'login' ? 'Open your books' : 'Start a new ledger'}</h1>
        <p className="muted">
          Demo: <code>demo@meridian.books</code> / <code>demo1234</code>
        </p>
        <form onSubmit={onSubmit}>
          {mode === 'register' && (
            <>
              <label className="field">
                Your name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                Company
                <input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  required
                />
              </label>
            </>
          )}
          <label className="field">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn sea" disabled={loading} type="submit">
            {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create company'}
          </button>
        </form>
        <button
          type="button"
          className="linkish"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Need a new company ledger?' : 'Already have an account?'}
        </button>
      </div>
    </div>
  );
}
