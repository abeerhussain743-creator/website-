import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem('relay_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setTeam(data.team);
      setPlan(data.plan);
    } catch {
      localStorage.removeItem('relay_token');
      setUser(null);
      setTeam(null);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('relay_token', data.token);
    setUser(data.user);
    setTeam(data.team);
    await refresh();
    return data;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('relay_token', data.token);
    setUser(data.user);
    setTeam(data.team);
    await refresh();
    return data;
  }

  function logout() {
    localStorage.removeItem('relay_token');
    setUser(null);
    setTeam(null);
    setPlan(null);
  }

  const can = (permission) => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    const map = {
      owner: ['*'],
      admin: [
        'team:read', 'team:write', 'leads:read', 'leads:write', 'leads:delete',
        'meetings:read', 'meetings:write', 'analytics:read', 'ai:use', 'billing:read', 'billing:write',
      ],
      manager: [
        'team:read', 'leads:read', 'leads:write', 'leads:delete',
        'meetings:read', 'meetings:write', 'analytics:read', 'ai:use', 'billing:read',
      ],
      sales: [
        'team:read', 'leads:read', 'leads:write',
        'meetings:read', 'meetings:write', 'analytics:read', 'ai:use',
      ],
    };
    const perms = map[user.role] || [];
    return perms.includes('*') || perms.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{ user, team, plan, loading, login, register, logout, refresh, can }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
