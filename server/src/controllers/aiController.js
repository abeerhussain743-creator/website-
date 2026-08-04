import Lead from '../models/Lead.js';
import Team from '../models/Team.js';
import { PLANS } from '../config/plans.js';
import { generateEmail, generateFollowUps } from '../services/aiService.js';

async function consumeCredit(team) {
  const plan = PLANS[team.plan] || PLANS.free;
  const now = new Date();
  const resetAt = new Date(team.aiCreditsResetAt || now);
  const monthElapsed =
    now.getFullYear() > resetAt.getFullYear() ||
    (now.getFullYear() === resetAt.getFullYear() && now.getMonth() > resetAt.getMonth());

  if (monthElapsed) {
    team.aiCreditsUsed = 0;
    team.aiCreditsResetAt = now;
  }

  if (team.aiCreditsUsed >= plan.aiCredits) {
    return { ok: false, message: 'AI credit limit reached for this billing period' };
  }

  team.aiCreditsUsed += 1;
  await team.save();
  return { ok: true, remaining: plan.aiCredits - team.aiCreditsUsed };
}

export async function emailAssist(req, res) {
  try {
    const { leadId, tone, goal, extraContext } = req.body;
    const lead = await Lead.findOne({ _id: leadId, team: req.user.team });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const team = await Team.findById(req.user.team);
    const credit = await consumeCredit(team);
    if (!credit.ok) return res.status(403).json({ message: credit.message });

    const result = await generateEmail({ lead, tone, goal, extraContext });

    lead.activities.push({
      type: 'ai',
      content: `AI generated email draft (${result.source}): ${result.subject}`,
      createdBy: req.user._id,
    });
    await lead.save();

    res.json({ ...result, creditsRemaining: credit.remaining });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'AI email generation failed' });
  }
}

export async function followUpAssist(req, res) {
  try {
    const { leadId } = req.body;
    const lead = await Lead.findOne({ _id: leadId, team: req.user.team });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const team = await Team.findById(req.user.team);
    const credit = await consumeCredit(team);
    if (!credit.ok) return res.status(403).json({ message: credit.message });

    const result = await generateFollowUps(lead);

    lead.activities.push({
      type: 'ai',
      content: `AI follow-up suggestions: ${result.nextBestAction}`,
      createdBy: req.user._id,
    });
    await lead.save();

    res.json({ ...result, creditsRemaining: credit.remaining });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'AI follow-up generation failed' });
  }
}
