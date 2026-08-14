import Call from '../models/Call.js';
import Proposal from '../models/Proposal.js';
import Client from '../models/Client.js';

export async function getDashboard(req, res) {
  try {
    const orgId = req.user.organization._id || req.user.organization;

    const [calls, proposals, clients] = await Promise.all([
      Call.find({ organization: orgId }).populate('client', 'companyName contactName').sort({ updatedAt: -1 }).limit(12),
      Proposal.find({ organization: orgId }),
      Client.find({ organization: orgId }),
    ]);

    const sent = proposals.filter((p) => ['sent', 'viewed', 'changes_requested', 'accepted', 'declined'].includes(p.status));
    const awaiting = proposals.filter((p) => ['sent', 'viewed', 'changes_requested'].includes(p.status));
    const won = proposals.filter((p) => p.status === 'accepted');
    const pipelineValue = [...awaiting, ...proposals.filter((p) => p.status === 'ready' || p.status === 'draft')]
      .reduce((sum, p) => sum + (p.investment || 0), 0);
    const wonValue = won.reduce((sum, p) => sum + (p.investment || 0), 0);
    const conversionRate = sent.length ? Math.round((won.length / sent.length) * 100) : 0;

    const recentCalls = calls.map((call) => ({
      id: call._id,
      title: call.title,
      companyName: call.client?.companyName,
      contactName: call.client?.contactName,
      status: call.status,
      urgency: call.analysis?.urgency,
      updatedAt: call.updatedAt,
      proposalId: call.proposal,
    }));

    const recentActivity = proposals
      .flatMap((p) =>
        (p.events || []).slice(-3).map((e) => ({
          proposalId: p._id,
          slug: p.slug,
          title: p.title,
          type: e.type,
          label: e.label,
          at: e.at,
        }))
      )
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 8);

    return res.json({
      greetingName: req.user.name.split(' ')[0],
      metrics: {
        pipelineValue,
        proposalsSent: sent.length,
        awaitingResponse: awaiting.length,
        wonDeals: won.length,
        wonValue,
        conversionRate,
        clients: clients.length,
        callsAnalyzed: calls.filter((c) => c.analysis?.processedAt).length,
      },
      recentCalls,
      recentActivity,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
