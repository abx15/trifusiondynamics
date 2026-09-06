import { MongoClient } from 'mongodb';
import dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configure DNS programmatically to Google Public DNS
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('Programmatically configured DNS to Google Public DNS');
} catch (err: any) {
  console.warn('Could not set DNS servers programmatically:', err.message);
}

const uri = process.env.MONGODB_URL as string;
if (!uri) {
  throw new Error('MONGODB_URL is not defined in environment variables');
}

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB Atlas!');
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (err: any) {
    console.error('Error connecting to MongoDB:', err.message);
  } finally {
    await client.close();
  }
}

main();
