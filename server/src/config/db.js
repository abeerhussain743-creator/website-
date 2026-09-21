import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

let memoryServer;

export async function connectDB() {
  if (env.mongodbUri) {
    await mongoose.connect(env.mongodbUri);
    console.log('MongoDB connected');
    return { mode: 'persistent' };
  }

  if (env.isProd) {
    throw new Error('MONGODB_URI is required in production');
  }

  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  console.log('In-memory MongoDB connected (demo mode)');
  return { mode: 'memory' };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
