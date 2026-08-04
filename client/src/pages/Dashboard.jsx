import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import api from '../api/client';
import { formatCurrency, formatDateTime, STAGE_COLORS, STAGE_LABELS } from '../utils/format';

const PIE_COLORS = ['#64748b', '#0ea5e9', '#14b8a6', '#f59e0b', '#f97316', '#22c55e', '#ef4444'];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) {
    return <div className="page"><p>Loading analytics…</p></div>;
  }

  const { summary, byStage, bySource, byOwner, weeks, upcomingMeetings, recentLeads } = data;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Analytics dashboard</h1>
          <p>Pipeline health, win rate, and team momentum in one view.</p>
        </div>
        <Link to="/pipeline" className="btn btn-primary">Open pipeline</Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Pipeline value</div>
          <div className="value">{formatCurrency(summary.pipelineValue)}</div>
          <div className="hint">{summary.openDeals} open deals</div>
        </div>
        <div className="stat-card">
          <div className="label">Won revenue</div>
          <div className="value">{formatCurrency(summary.wonValue)}</div>
          <div className="hint">{summary.winRate}% win rate</div>
        </div>
        <div className="stat-card">
          <div className="label">Total leads</div>
          <div className="value">{summary.totalLeads}</div>
          <div className="hint">{summary.teamSize} teammates</div>
        </div>
        <div className="stat-card">
          <div className="label">Meetings (30d)</div>
          <div className="value">{summary.meetingsThisMonth}</div>
          <div className="hint">Keep the calendar full</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Pipeline by stage</h2>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf5" />
                <XAxis dataKey="stage" tickFormatter={(v) => STAGE_LABELS[v] || v} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v, n) => (n === 'value' ? formatCurrency(v) : v)} />
                <Bar dataKey="count" fill="#1fa7a0" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Lead sources</h2>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={bySource} dataKey="count" nameKey="source" innerRadius={55} outerRadius={95} paddingAngle={3}>
                  {bySource.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Weekly trend</h2>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf5" />
                <XAxis dataKey="week" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="#0f2744" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="closed" stroke="#f5a623" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Owner leaderboard</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Rep</th>
                <th>Leads</th>
                <th>Won</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {byOwner.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{o.leads}</td>
                  <td>{o.won}</td>
                  <td>{formatCurrency(o.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Recent leads</h2>
            <Link to="/leads">View all</Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Stage</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((l) => (
                <tr key={l._id}>
                  <td><Link to={`/leads/${l._id}`}>{l.name}</Link></td>
                  <td>{l.company}</td>
                  <td>
                    <span className="badge badge-soft" style={{ background: `${STAGE_COLORS[l.stage]}22`, color: STAGE_COLORS[l.stage] }}>
                      {STAGE_LABELS[l.stage]}
                    </span>
                  </td>
                  <td>{formatCurrency(l.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel panel-pad">
          <div className="section-title">
            <h2>Upcoming meetings</h2>
            <Link to="/meetings">Schedule</Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <div className="empty">No upcoming meetings</div>
          ) : (
            upcomingMeetings.map((m) => (
              <div key={m._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--line)' }}>
                <strong>{m.title}</strong>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {formatDateTime(m.startAt)} · {m.lead?.name || 'Internal'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
