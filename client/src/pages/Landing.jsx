import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <nav className="landing-nav">
          <div className="brand" style={{ color: 'white' }}>
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 13a8 8 0 0 1 16 0" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="6" cy="15" r="1.6" fill="#F5A623" />
                <circle cx="12" cy="16" r="1.6" fill="white" />
                <circle cx="18" cy="15" r="1.6" fill="#D9F3F1" />
              </svg>
            </div>
            <div className="brand-text">
              <strong>Relay</strong>
              <span>AI CRM</span>
            </div>
          </div>
          <div className="cta-row">
            <Link to="/login" className="btn btn-secondary">Sign in</Link>
            <Link to="/register" className="btn btn-amber">Start free</Link>
          </div>
        </nav>

        <div className="landing-content">
          <div className="brand-hero">Relay</div>
          <h1>AI CRM that keeps every deal in motion</h1>
          <p>
            Pipeline, meetings, and follow-ups in one workspace — with AI drafts and next-step coaching built for sales teams.
          </p>
          <div className="cta-row">
            <Link to="/register" className="btn btn-primary">
              Create workspace <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Try demo account
            </Link>
          </div>
        </div>
      </section>

      <section className="features-strip">
        <h2>Built for modern revenue teams</h2>
        <p>Everything your reps need to qualify, nurture, and close — without hopping between five tools.</p>
        <div className="feature-grid">
          <article className="feature-item">
            <h3>Kanban pipeline</h3>
            <p>Drag deals across stages, track value, and see who owns what at a glance.</p>
          </article>
          <article className="feature-item">
            <h3>AI email & follow-ups</h3>
            <p>Generate outreach and next-best actions from lead context in seconds.</p>
          </article>
          <article className="feature-item">
            <h3>Team analytics</h3>
            <p>Win rates, source mix, and owner leaderboards update as your pipeline moves.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
