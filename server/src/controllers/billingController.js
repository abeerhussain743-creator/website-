import Organization from '../models/Organization.js';
import { PLANS } from '../config/plans.js';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function getBilling(req, res) {
  const org = await Organization.findById(req.user.organization);
  return res.json({
    plan: org.plan,
    plans: Object.values(PLANS),
    usage: org.usage,
    stripeEnabled: Boolean(stripe),
  });
}

export async function upgrade(req, res) {
  const { planId } = req.body;
  if (!PLANS[planId]) {
    return res.status(400).json({ message: 'Invalid plan' });
  }

  const org = await Organization.findById(req.user.organization);

  if (!stripe || planId === 'free') {
    org.plan = planId;
    await org.save();
    return res.json({
      mode: 'demo',
      organization: org,
      message: `Upgraded to ${PLANS[planId].name} (demo mode)`,
    });
  }

  // Live Stripe checkout would go here with STRIPE_PRICE_* keys
  org.plan = planId;
  await org.save();
  return res.json({
    mode: 'demo',
    organization: org,
    message: `Upgraded to ${PLANS[planId].name}`,
  });
}
