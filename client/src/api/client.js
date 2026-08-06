const API = '/api';

function getToken() {
  return localStorage.getItem('meridian_token');
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const authApi = {
  login: (body) => api('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => api('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api('/auth/me'),
};

export const reportsApi = {
  dashboard: () => api('/reports/dashboard'),
  trialBalance: () => api('/reports/trial-balance'),
  profitLoss: () => api('/reports/profit-loss'),
  balanceSheet: () => api('/reports/balance-sheet'),
  cashFlow: () => api('/reports/cash-flow'),
  generalLedger: (q = '') => api(`/reports/general-ledger${q}`),
  tax: () => api('/reports/tax'),
};

export const accountsApi = {
  list: () => api('/accounts'),
  journal: () => api('/accounts/journal'),
  postJournal: (body) => api('/accounts/journal', { method: 'POST', body: JSON.stringify(body) }),
};

export const commerceApi = {
  customers: () => api('/commerce/customers'),
  vendors: () => api('/commerce/vendors'),
  products: () => api('/commerce/products'),
  inventory: () => api('/commerce/inventory'),
  orders: () => api('/commerce/orders'),
  payments: () => api('/commerce/payments'),
  refunds: () => api('/commerce/refunds'),
  payouts: () => api('/commerce/payouts'),
  expenses: () => api('/commerce/expenses'),
  createExpense: (body) => api('/commerce/expenses', { method: 'POST', body: JSON.stringify(body) }),
  bankAccounts: () => api('/commerce/bank-accounts'),
  bankTransactions: (q = '') => api(`/commerce/bank-transactions${q}`),
  matchBank: (id, body) => api(`/commerce/bank-transactions/${id}/match`, { method: 'PATCH', body: JSON.stringify(body || {}) }),
  taxes: () => api('/commerce/taxes'),
  audit: () => api('/commerce/audit'),
  syncDemo: () => api('/commerce/sync/demo', { method: 'POST', body: '{}' }),
};
