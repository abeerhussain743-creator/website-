import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env, assertProductionReady } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { applySecurity, authLimiter } from './middleware/security.js';
import { seedDatabase } from './seed/seed.js';
import { User } from './models/index.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import commerceRoutes from './routes/commerce.js';
import reportRoutes from './routes/reports.js';
import shopifyRoutes from './routes/shopify.js';
import exportRoutes from './routes/exports.js';

assertProductionReady();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

applySecurity(app);

app.use(
  cors({
    origin: env.isProd ? env.clientUrl : true,
    credentials: true,
  })
);

// Raw body for Shopify webhook HMAC verification
app.use('/api/shopify/webhooks', express.raw({ type: '*/*' }));

app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'meridian-books', env: env.nodeEnv, time: new Date().toISOString() });
});

app.get('/api/ready', async (_req, res) => {
  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ ok: false, db: 'disconnected' });
    }
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/commerce', commerceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/exports', exportRoutes);

const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: env.isProd ? '1d' : 0 }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: env.isProd && status === 500 ? 'Internal server error' : err.message,
  });
});

let server;

async function start() {
  const { mode } = await connectDB();
  const shouldSeed =
    env.seedOnStart === 'true' || (env.seedOnStart !== 'false' && mode === 'memory');
  if (shouldSeed) {
    const count = await User.countDocuments();
    if (count === 0 || mode === 'memory') await seedDatabase();
  }

  server = app.listen(env.port, () => {
    console.log(`Meridian API on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down…`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

export default app;
