import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';
import { seedDatabase } from './seed/seed.js';
import { webhook as stripeWebhook } from './controllers/billingController.js';

import authRoutes from './routes/auth.js';
import teamRoutes from './routes/team.js';
import leadRoutes from './routes/leads.js';
import aiRoutes from './routes/ai.js';
import meetingRoutes from './routes/meetings.js';
import analyticsRoutes from './routes/analytics.js';
import billingRoutes from './routes/billing.js';
import notificationRoutes from './routes/notifications.js';
import { PIPELINE_STAGES, PLANS } from './config/plans.js';

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

initSocket(io);

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', product: 'Relay CRM', time: new Date().toISOString() });
});

app.get('/api/meta', (_req, res) => {
  res.json({ stages: PIPELINE_STAGES, plans: Object.values(PLANS) });
});

app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  if (process.env.SEED_ON_START !== 'false') {
    await seedDatabase();
  }
  server.listen(PORT, () => {
    console.log(`Relay API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
