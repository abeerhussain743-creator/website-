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
    organizationName: '',
    inviteCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 py-10">
      <form onSubmit={onSubmit} className="glass-panel w-full max-w-md rounded-[28px] p-7 animate-rise">
        <div className="font-display text-3xl font-700">Create workspace</div>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">Start generating proposals from sales calls.</p>
        <div className="mt-6 space-y-3">
          {[
            ['name', 'Your name', 'text'],
            ['email', 'Work email', 'email'],
            ['password', 'Password', 'password'],
            ['organizationName', 'Organization name', 'text'],
            ['inviteCode', 'Invite code (optional)', 'text'],
          ].map(([key, label, type]) => (
            <label key={key} className="block">
              <span className="text-sm">{label}</span>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 outline-none focus:border-teal-600"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                type={type}
                required={key !== 'inviteCode' && key !== 'organizationName'}
              />
            </label>
          ))}
        </div>
        {error && <div className="mt-4 text-sm text-rose-700">{error}</div>}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-teal-700 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="mt-4 text-center text-sm text-[var(--color-ink-soft)]">
          Already have an account? <Link className="text-teal-800 underline" to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
