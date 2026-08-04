import Team from '../models/Team.js';
import { PLANS } from '../config/plans.js';
import {
  createCheckoutSession,
  createPortalSession,
  isStripeConfigured,
  constructWebhookEvent,
} from '../services/stripeService.js';
import { createNotification } from '../services/notificationService.js';

export async function getPlans(req, res) {
  const team = await Team.findById(req.user.team);
  res.json({
    plans: Object.values(PLANS),
    currentPlan: team.plan,
    subscriptionStatus: team.subscriptionStatus,
    stripeConfigured: isStripeConfigured(),
    aiCreditsUsed: team.aiCreditsUsed,
    aiCreditsLimit: PLANS[team.plan].aiCredits,
  });
}

export async function checkout(req, res) {
  try {
    const { planId } = req.body;
    const team = await Team.findById(req.user.team);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const session = await createCheckoutSession({
      team,
      planId,
      successUrl: `${clientUrl}/billing?success=1`,
      cancelUrl: `${clientUrl}/billing?canceled=1`,
    });

    if (session.demo) {
      // Instant demo upgrade
      team.plan = planId;
      team.subscriptionStatus = 'active';
      await team.save();

      await createNotification({
        team: team._id,
        user: req.user._id,
        type: 'billing',
        title: 'Plan upgraded',
        message: `Your team is now on the ${PLANS[planId].name} plan (demo mode)`,
        link: '/billing',
      });
    }

    res.json(session);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function portal(req, res) {
  try {
    const team = await Team.findById(req.user.team);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const session = await createPortalSession({
      team,
      returnUrl: `${clientUrl}/billing`,
    });
    res.json(session);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function downgradeFree(req, res) {
  const team = await Team.findById(req.user.team);
  team.plan = 'free';
  team.subscriptionStatus = 'canceled';
  team.stripeSubscriptionId = '';
  await team.save();
  res.json({ team, plan: PLANS.free });
}

export async function webhook(req, res) {
  try {
    if (!isStripeConfigured()) {
      return res.status(400).json({ message: 'Stripe not configured' });
    }

    const event = constructWebhookEvent(req.body, req.headers['stripe-signature']);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const team = await Team.findById(session.metadata.teamId);
      if (team) {
        team.plan = session.metadata.planId;
        team.stripeSubscriptionId = session.subscription || '';
        team.subscriptionStatus = 'active';
        await team.save();
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const team = await Team.findOne({ stripeSubscriptionId: sub.id });
      if (team) {
        team.plan = 'free';
        team.subscriptionStatus = 'canceled';
        await team.save();
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }
}
