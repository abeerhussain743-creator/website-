import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed/seed.js';
import { PLANS } from './config/plans.js';

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import clientRoutes from './routes/clients.js';
import callRoutes from './routes/calls.js';
import proposalRoutes from './routes/proposals.js';
import publicRoutes from './routes/public.js';
import templateRoutes from './routes/templates.js';
import notificationRoutes from './routes/notifications.js';
import billingRoutes from './routes/billing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

function corsOrigin(origin, callback) {
  callback(null, true);
}

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    product: 'DealFlow AI',
    tagline: 'Turn every sales call into a ready-to-send proposal.',
    time: new Date().toISOString(),
  });
});

app.get('/api/meta', (_req, res) => {
  res.json({
    product: 'DealFlow AI',
    plans: Object.values(PLANS),
    templates: ['modern', 'corporate', 'creative', 'technical'],
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/billing', billingRoutes);

app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  const db = await connectDB();
  if (process.env.SEED_ON_BOOT !== 'false') {
    await seedDatabase();
  }
  app.listen(PORT, () => {
    console.log(`DealFlow AI API on http://localhost:${PORT} (${db.mode})`);
    console.log(`CORS client: ${clientUrl}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
