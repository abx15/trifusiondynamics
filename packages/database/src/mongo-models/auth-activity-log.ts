import { ObjectId } from 'mongodb';
import clientPromise from '../../mongo';

export interface AuthActivityLog {
  _id?: ObjectId;
  userId: string;
  organizationId: string;
  event: 'login' | 'logout' | 'refresh' | 'failed_login';
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

async function getCollection() {
  const client = await clientPromise;
  return client.db().collection<AuthActivityLog>('auth_activity_logs');
}

export const authActivityLogRepository = {
  async logEvent(data: Omit<AuthActivityLog, '_id' | 'createdAt'> & { createdAt?: Date }) {
    const collection = await getCollection();
    const doc: AuthActivityLog = {
      ...data,
      createdAt: data.createdAt || new Date(),
    };
    const result = await collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async getRecentActivity(userId: string, limit = 20) {
    const collection = await getCollection();
    return collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async getFailedLoginsSince(userId: string, since: Date) {
    const collection = await getCollection();
    return collection.countDocuments({
      userId,
      event: 'failed_login',
      createdAt: { $gte: since },
    });
  },
};
