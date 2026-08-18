import { MongoClient } from 'mongodb';

let client: MongoClient;

export async function connectMongo() {
  const url =
    process.env.TEST_MONGODB_URL || 'mongodb://localhost:27017/trifusion_test';
  client = new MongoClient(url);
  await client.connect();
  return client.db();
}

export async function clearMongo() {
  if (client) {
    const db = client.db();
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
}

export async function disconnectMongo() {
  if (client) {
    await client.close();
  }
}
