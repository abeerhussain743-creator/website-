import { useEffect, useState } from 'react';
import { Plug, RefreshCw, Unplug, Download, ShieldCheck } from 'lucide-react';
import { shopifyApi, exportsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

async function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const { user, company } = useAuth();
  const [status, setStatus] = useState(null);
  const [shop, setShop] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await shopifyApi.status();
    setStatus(data);
    if (data.connection?.shopDomain) {
      setShop(data.connection.shopDomain.replace('.myshopify.com', ''));
    }
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
    const params = new URLSearchParams(window.location.search);
    if (params.get('shopify') === 'connected') setMessage('Shopify connected successfully.');
    if (params.get('shopify') === 'error') setMessage(params.get('message') || 'Shopify connection failed.');
  }, []);

  async function connect() {
    setBusy(true);
    setMessage('');
    try {
      const { url } = await shopifyApi.install(shop);
      window.location.href = url;
    } catch (err) {
      setMessage(err.message);
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setMessage('');
    try {
      const result = await shopifyApi.sync();
      setMessage(
        `Sync complete: imported ${result.imported}, skipped ${result.skipped}, errors ${result.errors?.length || 0}`
      );
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect Shopify store?')) return;
    setBusy(true);
    try {
      await shopifyApi.disconnect();
      setMessage('Shopify disconnected.');
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function download(kind, type, filename) {
    setBusy(true);
    setMessage('');
    try {
      const blob =
        kind === 'excel' ? await exportsApi.downloadExcel(type) : await exportsApi.downloadPdf(type);
      await saveBlob(blob, filename);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.connection?.status === 'connected';

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Settings</h1>
          <p className="lede">Connect Shopify, manage exports, and review production readiness.</p>
        </div>
      </div>

      {message && <div className="banner">{message}</div>}

      <section className="panel">
        <div className="panel-head">
          <h2>Company</h2>
        </div>
        <div className="settings-grid">
          <div>
            <span className="label">Company</span>
            <strong>{company?.companyName}</strong>
          </div>
          <div>
            <span className="label">Currency</span>
            <strong>{company?.currency || 'USD'}</strong>
          </div>
          <div>
            <span className="label">Signed in as</span>
            <strong>
              {user?.name} · {user?.role}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Shopify connection</h2>
          <span className={`pill ${connected ? 'ok' : ''}`}>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {!status?.configured && (
          <p className="muted" style={{ padding: '0 1.25rem' }}>
            Server Shopify credentials are not configured. Set <code>SHOPIFY_API_KEY</code> and{' '}
            <code>SHOPIFY_API_SECRET</code> for live OAuth.
          </p>
        )}
        <div className="settings-row">
          <label>
            Shop domain
            <input
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="your-store"
              disabled={connected || busy}
            />
          </label>
          <span className="suffix">.myshopify.com</span>
        </div>
        {connected && (
          <p className="muted" style={{ padding: '0 1.25rem 1rem' }}>
            Last sync:{' '}
            {status.connection.lastSyncAt
              ? new Date(status.connection.lastSyncAt).toLocaleString()
              : 'Never'}
          </p>
        )}
        <div className="actions">
          {!connected ? (
            <button className="btn primary" type="button" disabled={busy || !shop} onClick={connect}>
              <Plug size={16} /> Connect Shopify
            </button>
          ) : (
            <>
              <button className="btn primary" type="button" disabled={busy} onClick={sync}>
                <RefreshCw size={16} /> Sync orders
              </button>
              <button className="btn ghost" type="button" disabled={busy} onClick={disconnect}>
                <Unplug size={16} /> Disconnect
              </button>
            </>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Exports</h2>
        </div>
        <p className="muted" style={{ padding: '0 1.25rem' }}>
          Download production-ready Excel or PDF financial packs.
        </p>
        <div className="actions wrap">
          <button className="btn ghost" type="button" disabled={busy} onClick={() => download('excel', 'trial-balance', 'trial-balance.xlsx')}>
            <Download size={16} /> Trial balance XLSX
          </button>
          <button className="btn ghost" type="button" disabled={busy} onClick={() => download('excel', 'profit-loss', 'profit-loss.xlsx')}>
            <Download size={16} /> P&amp;L XLSX
          </button>
          <button className="btn ghost" type="button" disabled={busy} onClick={() => download('excel', 'balance-sheet', 'balance-sheet.xlsx')}>
            <Download size={16} /> Balance sheet XLSX
          </button>
          <button className="btn ghost" type="button" disabled={busy} onClick={() => download('pdf', 'profit-loss', 'profit-loss.pdf')}>
            <Download size={16} /> P&amp;L PDF
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Production checklist</h2>
        </div>
        <ul className="check-list">
          <li>
            <ShieldCheck size={16} /> Persistent MongoDB via <code>MONGODB_URI</code>
          </li>
          <li>
            <ShieldCheck size={16} /> Strong <code>JWT_SECRET</code> (32+ chars)
          </li>
          <li>
            <ShieldCheck size={16} /> Shopify app credentials + webhook HMAC
          </li>
          <li>
            <ShieldCheck size={16} /> HTTPS reverse proxy with <code>TRUST_PROXY=true</code>
          </li>
          <li>
            <ShieldCheck size={16} /> Role-based access (owner / admin / accountant / viewer)
          </li>
        </ul>
      </section>
    </div>
  );
}
