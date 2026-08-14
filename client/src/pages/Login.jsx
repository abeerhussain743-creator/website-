import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('alex@dealflow.ai');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 py-10">
      <form onSubmit={onSubmit} className="glass-panel w-full max-w-md rounded-[28px] p-7 animate-rise">
        <div className="font-display text-3xl font-700">Welcome back</div>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Demo: <span className="font-medium text-[var(--color-ink)]">alex@dealflow.ai</span> / demo1234
        </p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 outline-none focus:border-teal-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm">Password</span>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 outline-none focus:border-teal-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
        </div>
        {error && <div className="mt-4 text-sm text-rose-700">{error}</div>}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-teal-700 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="mt-4 text-center text-sm text-[var(--color-ink-soft)]">
          New here? <Link className="text-teal-800 underline" to="/register">Create workspace</Link>
        </p>
      </form>
    </div>
  );
}
