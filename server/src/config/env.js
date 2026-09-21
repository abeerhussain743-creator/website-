import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

function required(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: isProd
    ? required('JWT_SECRET', process.env.JWT_SECRET)
    : process.env.JWT_SECRET || 'meridian-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`,
  seedOnStart: process.env.SEED_ON_START,
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    scopes:
      process.env.SHOPIFY_SCOPES ||
      'read_orders,read_products,read_customers,read_shopify_payments_payouts,read_inventory',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-10',
  },
  trustProxy: process.env.TRUST_PROXY === 'true' || isProd,
};

export function assertProductionReady() {
  if (!isProd) return;
  required('JWT_SECRET', process.env.JWT_SECRET);
  required('MONGODB_URI', process.env.MONGODB_URI);
  if (env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}
