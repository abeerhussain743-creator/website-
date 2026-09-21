import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { webhookLimiter } from '../middleware/security.js';
import { Company } from '../models/index.js';
import { env } from '../config/env.js';
import {
  shopifyConfigured,
  createInstallUrl,
  consumeOAuthState,
  verifyOAuthHmac,
  verifyWebhookHmac,
  exchangeToken,
  saveShopifyConnection,
  disconnectShopify,
  syncOrdersFromShopify,
  handleOrderWebhook,
  findCompanyByShop,
  normalizeShop,
} from '../services/shopifyService.js';

const router = Router();

router.get('/status', requireAuth, async (req, res) => {
  const company = await Company.findById(req.companyId).select('companyName shopify');
  res.json({
    configured: shopifyConfigured(),
    connection: {
      status: company?.shopify?.status || 'disconnected',
      shopDomain: company?.shopify?.shopDomain || null,
      installedAt: company?.shopify?.installedAt || null,
      lastSyncAt: company?.shopify?.lastSyncAt || null,
      scope: company?.shopify?.scope || null,
    },
  });
});

router.post('/install', requireAuth, requireMinRole('admin'), async (req, res) => {
  try {
    const shop = normalizeShop(req.body.shop);
    const url = createInstallUrl(req.companyId, req.user._id, shop);
    res.json({ url, shop });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/callback', async (req, res) => {
  try {
    if (!verifyOAuthHmac(req.query)) return res.status(401).send('Invalid HMAC');
    const state = consumeOAuthState(req.query.state);
    if (!state) return res.status(400).send('Invalid or expired OAuth state');
    if (normalizeShop(req.query.shop) !== state.shop) return res.status(400).send('Shop mismatch');

    const tokenPayload = await exchangeToken(req.query.shop, req.query.code);
    await saveShopifyConnection(state.companyId, {
      shop: state.shop,
      accessToken: tokenPayload.access_token,
      scope: tokenPayload.scope,
      userId: state.userId,
    });

    res.redirect(`${env.clientUrl}/app/settings?shopify=connected`);
  } catch (err) {
    console.error('Shopify OAuth callback error', err);
    res.redirect(
      `${env.clientUrl}/app/settings?shopify=error&message=${encodeURIComponent(err.message)}`
    );
  }
});

router.post('/disconnect', requireAuth, requireMinRole('admin'), async (req, res) => {
  try {
    await disconnectShopify(req.companyId, req.user._id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sync', requireAuth, requireMinRole('accountant'), async (req, res) => {
  try {
    const results = await syncOrdersFromShopify(req.companyId, {
      userId: req.user._id,
      limit: Number(req.body.limit || 50),
    });
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/webhooks/orders-create', webhookLimiter, async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const shop = req.get('X-Shopify-Shop-Domain');
    const rawBuf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    if (!verifyWebhookHmac(rawBuf, hmac)) {
      return res.status(401).json({ error: 'Invalid webhook HMAC' });
    }
    const company = await findCompanyByShop(shop);
    if (!company) return res.status(404).json({ error: 'Shop not registered' });
    const order = JSON.parse(rawBuf.toString('utf8'));
    const result = await handleOrderWebhook(company._id, order);
    res.json({ ok: true, skipped: result.skipped, orderId: result.order?._id });
  } catch (err) {
    console.error('Webhook orders-create error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
