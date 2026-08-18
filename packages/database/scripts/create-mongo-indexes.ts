import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from workspace root if necessary, or from database dir
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/agencyos';

async function createMongoIndexes() {
  console.log(`Connecting to MongoDB at ${MONGODB_URL}...`);
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    const db = client.db(); // use default db from URL

    console.log('Connected successfully. Creating indexes...');

    // 1. ticket_messages: index on { ticketId: 1, createdAt: -1 }
    const ticketMessages = db.collection('ticket_messages');
    await ticketMessages.createIndex({ ticketId: 1, createdAt: -1 });
    console.log('Created index on ticket_messages: { ticketId: 1, createdAt: -1 }');

    // 2. auth_activity_logs: index on { userId: 1, createdAt: -1 } + TTL index
    const activityLogs = db.collection('auth_activity_logs');
    await activityLogs.createIndex({ userId: 1, createdAt: -1 });
    console.log('Created index on auth_activity_logs: { userId: 1, createdAt: -1 }');
    
    await activityLogs.createIndex(
      { createdAt: 1 }, 
      { expireAfterSeconds: 7776000 } // 90 days
    );
    console.log('Created TTL index on auth_activity_logs: expireAfterSeconds = 90 days');

    // 3. attendance_punches: index on { employeeId: 1, timestamp: -1 }
    const attendancePunches = db.collection('attendance_punches');
    await attendancePunches.createIndex({ employeeId: 1, timestamp: -1 });
    console.log('Created index on attendance_punches: { employeeId: 1, timestamp: -1 }');

    console.log('\n--- Current Indexes ---');
    console.log('ticket_messages:', await ticketMessages.indexes());
    console.log('auth_activity_logs:', await activityLogs.indexes());
    console.log('attendance_punches:', await attendancePunches.indexes());

  } catch (err) {
    console.error('Error creating Mongo indexes:', err);
  } finally {
    await client.close();
  }
}

createMongoIndexes().then(() => console.log('Done'));
