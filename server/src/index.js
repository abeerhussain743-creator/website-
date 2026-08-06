import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed/seed.js';
import { User } from './models/index.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import commerceRoutes from './routes/commerce.js';
import reportRoutes from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'meridian-books', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/commerce', commerceRoutes);
app.use('/api/reports', reportRoutes);

const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function start() {
  const { mode } = await connectDB();
  const shouldSeed = process.env.SEED_ON_START !== 'false' && (mode === 'memory' || process.env.SEED_ON_START === 'true');
  if (shouldSeed) {
    const count = await User.countDocuments();
    if (count === 0 || mode === 'memory') {
      await seedDatabase();
    }
  }

  app.listen(PORT, () => {
    console.log(`Meridian API on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
