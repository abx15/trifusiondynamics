import { ObjectId } from 'mongodb';
import clientPromise from '../../mongo';

export interface AttendancePunch {
  _id?: ObjectId;
  employeeId: string;
  organizationId: string;
  type: 'check_in' | 'check_out';
  timestamp: Date;
  location?: { lat: number; lng: number };
}

async function getCollection() {
  const client = await clientPromise;
  return client.db().collection<AttendancePunch>('attendance_punches');
}

export const attendancePunchRepository = {
  async recordPunch(data: Omit<AttendancePunch, '_id' | 'timestamp'> & { timestamp?: Date }) {
    const collection = await getCollection();
    const doc: AttendancePunch = {
      ...data,
      timestamp: data.timestamp || new Date(),
    };
    const result = await collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async getPunchesForDate(employeeId: string, date: Date) {
    const collection = await getCollection();
    
    // Calculate start and end of that specific date in UTC
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    return collection
      .find({
        employeeId,
        timestamp: {
          $gte: start,
          $lte: end,
        },
      })
      .sort({ timestamp: 1 })
      .toArray();
  },

  async getPunchesForEmployeeInRange(employeeId: string, from: Date, to: Date) {
    const collection = await getCollection();
    return collection
      .find({
        employeeId,
        timestamp: {
          $gte: from,
          $lte: to,
        },
      })
      .sort({ timestamp: 1 })
      .toArray();
  },
};
