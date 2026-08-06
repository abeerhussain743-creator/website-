import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenCheck, RefreshCw, Scale } from 'lucide-react';
import './Landing.css';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="brand-mark">
          <span className="brand-glyph" aria-hidden />
          Meridian
        </Link>
        <nav>
          <a href="#flow">Automation</a>
          <a href="#modules">Modules</a>
          <Link to="/login">Sign in</Link>
          <Link to="/login" className="btn sea">
            Open books
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-veil" />
        <div className="hero-grid" aria-hidden />
        <div className="hero-copy">
          <motion.p className="brand-hero" variants={fadeUp} initial="hidden" animate="show" custom={0}>
            Meridian
          </motion.p>
          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}>
            Shopify books that stay in balance.
          </motion.h1>
          <motion.p className="hero-sub" variants={fadeUp} initial="hidden" animate="show" custom={2}>
            Double-entry bookkeeping for Shopify stores — orders, fees, inventory, and payouts posted
            automatically to a real general ledger.
          </motion.p>
          <motion.div className="hero-cta" variants={fadeUp} initial="hidden" animate="show" custom={3}>
            <Link to="/login" className="btn">
              Launch demo ledger <ArrowRight size={18} />
            </Link>
            <a href="#flow" className="btn ghost">
              See the posting flow
            </a>
          </motion.div>
        </div>
        <motion.div
          className="hero-visual"
          aria-hidden
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="ledger-plane">
            <div className="ledger-row">
              <span>Shopify Clearing</span>
              <strong>172.00 Dr</strong>
            </div>
            <div className="ledger-row soft">
              <span>Product Sales</span>
              <strong>150.00 Cr</strong>
            </div>
            <div className="ledger-row soft">
              <span>Shipping Income</span>
              <strong>10.00 Cr</strong>
            </div>
            <div className="ledger-row soft">
              <span>Sales Tax Payable</span>
              <strong>12.00 Cr</strong>
            </div>
            <div className="ledger-balance">
              <span>Balanced entry</span>
              <em>Debits = Credits</em>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="section" id="flow">
        <div className="section-copy">
          <h2>One Shopify order. A complete accounting trail.</h2>
          <p>
            From sale to payout, Meridian posts clearing, revenue, tax, COGS, fees, and bank deposits —
            so your P&amp;L and balance sheet move together.
          </p>
        </div>
        <ol className="flow-list">
          {[
            ['Create invoice', 'Order total lands in Shopify Clearing'],
            ['Post journal', 'Credit sales, shipping, and tax payable'],
            ['Relieve inventory', 'Debit COGS, credit Inventory'],
            ['Capture fees', 'Merchant fees reduce clearing'],
            ['Reconcile payout', 'Debit Bank, credit Shopify Clearing'],
          ].map(([title, copy], i) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="section modules" id="modules">
        <div className="section-copy">
          <h2>Built for store finance, not spreadsheet chaos.</h2>
          <p>Financial statements, Shopify sales, inventory, bank and payout reconciliation — in one ledger.</p>
        </div>
        <div className="module-grid">
          {[
            [Scale, 'True double-entry', 'Every transaction posts balanced journal lines across your chart of accounts.'],
            [RefreshCw, 'Shopify automation', 'Orders, refunds, fees, and payouts sync into accounting entries.'],
            [BookOpenCheck, 'Close-ready reports', 'P&L, balance sheet, cash flow, trial balance, and general ledger.'],
          ].map(([Icon, title, copy]) => (
            <article key={title}>
              <Icon size={22} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <strong className="brand-mark">Meridian</strong>
          <p className="muted">Shopify bookkeeping that scales from first sale to multi-entity ops.</p>
        </div>
        <Link to="/login" className="btn secondary">
          Try demo@meridian.books
        </Link>
      </footer>
    </div>
  );
}
