import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from './seed.js';

await connectDB();
await seedDatabase();
await disconnectDB();
