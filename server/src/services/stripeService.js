import Stripe from 'stripe';
import { PLANS } from '../config/plans.js';

let stripe;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

const PRICE_ENV_MAP = {
  starter: 'STRIPE_PRICE_STARTER',
  growth: 'STRIPE_PRICE_GROWTH',
  scale: 'STRIPE_PRICE_SCALE',
};

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession({ team, planId, successUrl, cancelUrl }) {
  const stripeClient = getStripe();
  const plan = PLANS[planId];

  if (!plan || planId === 'free') {
    throw new Error('Invalid plan');
  }

  if (!stripeClient) {
    // Demo mode: simulate upgrade without Stripe
    return {
      demo: true,
      url: `${successUrl}?demo=1&plan=${planId}`,
      planId,
    };
  }

  const priceId = process.env[PRICE_ENV_MAP[planId]];
  if (!priceId) {
    throw new Error(`Stripe price not configured for ${planId}`);
  }

  let customerId = team.stripeCustomerId;
  if (!customerId) {
    const customer = await stripeClient.customers.create({
      name: team.name,
      metadata: { teamId: String(team._id) },
    });
    customerId = customer.id;
    team.stripeCustomerId = customerId;
    await team.save();
  }

  const session = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { teamId: String(team._id), planId },
  });

  return { url: session.url, sessionId: session.id };
}

export async function createPortalSession({ team, returnUrl }) {
  const stripeClient = getStripe();
  if (!stripeClient || !team.stripeCustomerId) {
    return { demo: true, url: returnUrl };
  }

  const session = await stripeClient.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

export function constructWebhookEvent(rawBody, signature) {
  const stripeClient = getStripe();
  if (!stripeClient) throw new Error('Stripe not configured');
  return stripeClient.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
