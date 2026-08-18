import { MongoClient } from 'mongodb';
import dns from 'dns';

// Configure DNS programmatically to Google Public DNS
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('Programmatically configured DNS to Google Public DNS (8.8.8.8, 8.8.4.4)');
} catch (err) {
  console.warn('Could not set DNS servers programmatically:', err);
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URL;
if (!uri) {
  throw new Error('MONGODB_URL is not defined in environment variables');
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
