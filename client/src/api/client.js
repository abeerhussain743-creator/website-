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
  importBankCsv: async (bankAccountId, file) => {
    const form = new FormData();
    form.append('file', file);
    const token = getToken();
    const res = await fetch(`${API}/commerce/bank-accounts/${bankAccountId}/import-csv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  },
  fiscalClose: (year) =>
    api('/commerce/fiscal-close', { method: 'POST', body: JSON.stringify({ year }) }),
  taxes: () => api('/commerce/taxes'),
  audit: () => api('/commerce/audit'),
  syncDemo: () => api('/commerce/sync/demo', { method: 'POST', body: '{}' }),
};

export const shopifyApi = {
  status: () => api('/shopify/status'),
  install: (shop) => api('/shopify/install', { method: 'POST', body: JSON.stringify({ shop }) }),
  sync: (limit = 50) => api('/shopify/sync', { method: 'POST', body: JSON.stringify({ limit }) }),
  disconnect: () => api('/shopify/disconnect', { method: 'POST', body: '{}' }),
};

function authQuery() {
  const token = getToken();
  return token ? `?access_token=${encodeURIComponent(token)}` : '';
}

export const exportsApi = {
  excelUrl: (type) => `${API}/exports/excel/${type}`,
  pdfUrl: (type) => `${API}/exports/pdf/${type}`,
  downloadExcel: async (type) => {
    const token = getToken();
    const res = await fetch(`${API}/exports/excel/${type}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText);
    }
    return res.blob();
  },
  downloadPdf: async (type) => {
    const token = getToken();
    const res = await fetch(`${API}/exports/pdf/${type}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText);
    }
    return res.blob();
  },
};

