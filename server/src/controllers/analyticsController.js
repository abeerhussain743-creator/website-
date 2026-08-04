import Lead from '../models/Lead.js';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';

export async function getDashboard(req, res) {
  const teamId = req.user.team;
  const ownerFilter = req.user.role === 'sales' ? { owner: req.user._id } : {};
  const base = { team: teamId, ...ownerFilter };

  const [leads, meetings, members] = await Promise.all([
    Lead.find(base),
    Meeting.find({ team: teamId, startAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
    User.find({ team: teamId, isActive: true }),
  ]);

  const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const byStage = stages.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
    value: leads.filter((l) => l.stage === stage).reduce((s, l) => s + (l.value || 0), 0),
  }));

  const won = leads.filter((l) => l.stage === 'won');
  const lost = leads.filter((l) => l.stage === 'lost');
  const open = leads.filter((l) => !['won', 'lost'].includes(l.stage));
  const pipelineValue = open.reduce((s, l) => s + (l.value || 0), 0);
  const wonValue = won.reduce((s, l) => s + (l.value || 0), 0);
  const winRate = won.length + lost.length > 0
    ? Math.round((won.length / (won.length + lost.length)) * 100)
    : 0;

  const bySource = Object.entries(
    leads.reduce((acc, l) => {
      acc[l.source] = (acc[l.source] || 0) + 1;
      return acc;
    }, {})
  ).map(([source, count]) => ({ source, count }));

  const byOwner = members.map((m) => {
    const owned = leads.filter((l) => String(l.owner) === String(m._id));
    return {
      id: m._id,
      name: m.name,
      leads: owned.length,
      won: owned.filter((l) => l.stage === 'won').length,
      value: owned.filter((l) => l.stage === 'won').reduce((s, l) => s + l.value, 0),
    };
  }).sort((a, b) => b.value - a.value);

  // Last 8 weeks trend
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const created = leads.filter((l) => l.createdAt >= start && l.createdAt < end).length;
    const closed = leads.filter(
      (l) => l.stage === 'won' && l.updatedAt >= start && l.updatedAt < end
    ).length;
    weeks.push({
      week: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      created,
      closed,
    });
  }

  const upcomingMeetings = await Meeting.find({
    team: teamId,
    startAt: { $gte: new Date() },
    status: 'scheduled',
  })
    .populate('lead', 'name company')
    .sort({ startAt: 1 })
    .limit(5);

  const recentLeads = await Lead.find(base)
    .populate('owner', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    summary: {
      totalLeads: leads.length,
      openDeals: open.length,
      pipelineValue,
      wonValue,
      winRate,
      meetingsThisMonth: meetings.length,
      teamSize: members.length,
    },
    byStage,
    bySource,
    byOwner,
    weeks,
    upcomingMeetings,
    recentLeads,
  });
}
