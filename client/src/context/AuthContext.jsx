import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('meridian_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((data) => {
        setUser(data.user);
        setCompany(data.company);
      })
      .catch(() => localStorage.removeItem('meridian_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await authApi.login({ email, password });
    localStorage.setItem('meridian_token', data.token);
    setUser(data.user);
    setCompany(data.company);
    return data;
  }

  async function register(payload) {
    const data = await authApi.register(payload);
    localStorage.setItem('meridian_token', data.token);
    setUser(data.user);
    setCompany(data.company);
    return data;
  }

  function logout() {
    localStorage.removeItem('meridian_token');
    setUser(null);
    setCompany(null);
  }

  return (
    <AuthContext.Provider value={{ user, company, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
