import { PrismaClient } from '@prisma/client';
import dns from 'dns';

// Configure DNS programmatically to Google Public DNS
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn('Could not set DNS servers programmatically in index.ts:', err);
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

export * from '@prisma/client';
export { default as mongoClientPromise } from './mongo';
export * from './src/mongo-models/auth-activity-log';
export * from './src/mongo-models/attendance-punch';
export * from './src/mongo-models/ticket-message';
export default prisma;
