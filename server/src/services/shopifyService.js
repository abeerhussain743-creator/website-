import crypto from 'crypto';
import { Company, Product, Customer, Order, AuditLog } from '../models/index.js';
import { env } from '../config/env.js';
import { processShopifyOrder } from './shopifyAutomation.js';

const OAUTH_STATES = new Map();

function pruneStates() {
  const now = Date.now();
  for (const [k, v] of OAUTH_STATES) {
    if (v.expires < now) OAUTH_STATES.delete(k);
  }
}

export function shopifyConfigured() {
  return Boolean(env.shopify.apiKey && env.shopify.apiSecret);
}

export function normalizeShop(shop) {
  let s = String(shop || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (!s.includes('.')) s = `${s}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s)) {
    throw new Error('Invalid Shopify shop domain');
  }
  return s;
}

export function createInstallUrl(companyId, userId, shop) {
  if (!shopifyConfigured()) {
    throw new Error('Shopify API credentials are not configured on the server');
  }
  const domain = normalizeShop(shop);
  pruneStates();
  const state = crypto.randomBytes(24).toString('hex');
  OAUTH_STATES.set(state, {
    companyId: String(companyId),
    userId: String(userId),
    shop: domain,
    expires: Date.now() + 10 * 60 * 1000,
  });
  const redirectUri = `${env.publicApiUrl}/api/shopify/callback`;
  const params = new URLSearchParams({
    client_id: env.shopify.apiKey,
    scope: env.shopify.scopes,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${domain}/admin/oauth/authorize?${params}`;
}

export function consumeOAuthState(state) {
  pruneStates();
  const data = OAUTH_STATES.get(state);
  OAUTH_STATES.delete(state);
  return data || null;
}

export function verifyOAuthHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac || !env.shopify.apiSecret) return false;
  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(',') : rest[k]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', env.shopify.apiSecret).update(message).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(String(hmac), 'utf8'));
  } catch {
    return false;
  }
}

export function verifyWebhookHmac(rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_API_SECRET || env.shopify.apiSecret;
  if (!hmacHeader || !secret) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(hmacHeader)));
  } catch {
    return false;
  }
}

export async function exchangeToken(shop, code) {
  const domain = normalizeShop(shop);
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.shopify.apiKey,
      client_secret: env.shopify.apiSecret,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Shopify token exchange failed: ${await res.text()}`);
  return res.json();
}

async function shopifyFetch(shop, accessToken, apiPath) {
  const url = `https://${shop}/admin/api/${env.shopify.apiVersion}${apiPath}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
  });
  if (!res.ok) throw new Error(`Shopify API ${apiPath} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function getCompanyShopify(companyId) {
  return Company.findById(companyId).select('+shopify.accessToken companyName shopify');
}

export async function saveShopifyConnection(companyId, { shop, accessToken, scope, userId }) {
  const company = await Company.findById(companyId).select('+shopify.accessToken');
  if (!company) throw new Error('Company not found');
  company.shopify = {
    shopDomain: shop,
    accessToken,
    scope: scope || null,
    installedAt: new Date(),
    lastSyncAt: company.shopify?.lastSyncAt || null,
    webhookSecret: env.shopify.apiSecret,
    status: 'connected',
  };
  await company.save();
  await AuditLog.create({
    companyId,
    userId,
    action: 'shopify.connected',
    entityType: 'Company',
    entityId: String(companyId),
    detail: `Connected shop ${shop}`,
  });
  return company;
}

export async function disconnectShopify(companyId, userId) {
  const company = await Company.findById(companyId).select('+shopify.accessToken');
  if (!company) throw new Error('Company not found');
  company.shopify = {
    shopDomain: null,
    accessToken: null,
    scope: null,
    installedAt: null,
    lastSyncAt: null,
    webhookSecret: null,
    status: 'disconnected',
  };
  await company.save();
  await AuditLog.create({
    companyId,
    userId,
    action: 'shopify.disconnected',
    entityType: 'Company',
    entityId: String(companyId),
    detail: 'Shopify store disconnected',
  });
  return company;
}

function mapShopifyOrder(order, { customerId = null, productCostMap = {} } = {}) {
  const subtotal = Number(order.subtotal_price || 0);
  const tax = Number(order.total_tax || 0);
  const shipping = (order.shipping_lines || []).reduce((s, l) => s + Number(l.price || 0), 0);
  const discount = Number(order.total_discounts || 0);
  const total = Number(order.total_price || subtotal - discount + tax + shipping);
  const lineItems = (order.line_items || []).map((li) => {
    const unitCost = productCostMap[String(li.product_id)] || productCostMap[li.sku] || 0;
    return {
      productId: null,
      title: li.title,
      quantity: li.quantity,
      unitPrice: Number(li.price || 0),
      unitCost,
      shopifyProductId: li.product_id ? String(li.product_id) : null,
      sku: li.sku || '',
    };
  });
  const costOfGoods = lineItems.reduce((s, li) => s + li.unitCost * li.quantity, 0);
  const shopifyFee = Math.round((total * 0.029 + 0.3) * 100) / 100;

  return {
    shopifyOrderId: String(order.id),
    customerId,
    orderNumber: order.name || `#${order.order_number}`,
    subtotal,
    discount,
    tax,
    shipping,
    total,
    costOfGoods,
    shopifyFee,
    financialStatus: order.financial_status || 'paid',
    fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
    lineItems,
    paymentDate: order.processed_at || order.created_at,
    gateway: order.payment_gateway_names?.[0] || 'shopify_payments',
    transactionId: String(order.id),
    createdAt: order.created_at ? new Date(order.created_at) : new Date(),
  };
}

async function ensureCustomer(companyId, shopifyCustomer) {
  if (!shopifyCustomer?.id) return null;
  const shopifyCustomerId = String(shopifyCustomer.id);
  let customer = await Customer.findOne({ companyId, shopifyCustomerId });
  if (customer) return customer;
  return Customer.create({
    companyId,
    shopifyCustomerId,
    name:
      [shopifyCustomer.first_name, shopifyCustomer.last_name].filter(Boolean).join(' ') ||
      shopifyCustomer.email ||
      'Shopify Customer',
    email: shopifyCustomer.email || '',
    phone: shopifyCustomer.phone || '',
    country: shopifyCustomer.default_address?.country_code || 'US',
  });
}

export async function syncOrdersFromShopify(companyId, { userId = null, limit = 50 } = {}) {
  const company = await getCompanyShopify(companyId);
  if (!company?.shopify?.accessToken || !company.shopify.shopDomain) {
    throw new Error('Shopify is not connected');
  }

  const products = await Product.find({ companyId });
  const productCostMap = {};
  for (const p of products) {
    if (p.shopifyProductId) productCostMap[String(p.shopifyProductId).replace(/\D/g, '')] = p.cost || 0;
    if (p.sku) productCostMap[p.sku] = p.cost || 0;
  }

  const data = await shopifyFetch(
    company.shopify.shopDomain,
    company.shopify.accessToken,
    `/orders.json?status=any&limit=${Math.min(limit, 100)}`
  );

  const results = { imported: 0, skipped: 0, errors: [] };
  for (const order of data.orders || []) {
    const existing = await Order.findOne({ companyId, shopifyOrderId: String(order.id) });
    if (existing) {
      results.skipped += 1;
      continue;
    }
    try {
      const customer = await ensureCustomer(companyId, order.customer);
      const payload = mapShopifyOrder(order, {
        customerId: customer?._id || null,
        productCostMap,
      });
      for (const li of payload.lineItems) {
        const match = products.find(
          (p) =>
            (li.sku && p.sku === li.sku) ||
            (li.shopifyProductId && String(p.shopifyProductId).includes(String(li.shopifyProductId)))
        );
        if (match) {
          li.productId = match._id;
          li.unitCost = match.cost || li.unitCost;
        }
      }
      payload.costOfGoods = payload.lineItems.reduce(
        (s, li) => s + (li.unitCost || 0) * (li.quantity || 0),
        0
      );
      await processShopifyOrder(companyId, payload, userId);
      results.imported += 1;
    } catch (err) {
      results.errors.push({ order: order.name, error: err.message });
    }
  }

  company.shopify.lastSyncAt = new Date();
  company.shopify.status = 'connected';
  await company.save();

  await AuditLog.create({
    companyId,
    userId,
    action: 'shopify.sync',
    entityType: 'Order',
    entityId: '',
    detail: `Synced orders · imported ${results.imported}, skipped ${results.skipped}, errors ${results.errors.length}`,
  });

  return results;
}

export async function handleOrderWebhook(companyId, order) {
  const existing = await Order.findOne({ companyId, shopifyOrderId: String(order.id) });
  if (existing) return { skipped: true, order: existing };
  const customer = await ensureCustomer(companyId, order.customer);
  const products = await Product.find({ companyId });
  const productCostMap = {};
  for (const p of products) {
    if (p.sku) productCostMap[p.sku] = p.cost || 0;
  }
  const payload = mapShopifyOrder(order, { customerId: customer?._id || null, productCostMap });
  const created = await processShopifyOrder(companyId, payload, null);
  return { skipped: false, order: created };
}

export async function findCompanyByShop(shopDomain) {
  const shop = normalizeShop(shopDomain);
  return Company.findOne({ 'shopify.shopDomain': shop }).select('+shopify.accessToken companyName shopify');
}
