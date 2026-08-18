import { ObjectId } from 'mongodb';
import clientPromise from '../../mongo';

export interface TicketMessage {
  _id?: ObjectId;
  ticketId: string;
  organizationId: string;
  senderId: string;
  senderType: 'agent' | 'client' | 'system';
  content: string;
  attachments?: string[];
  createdAt: Date;
  isInternal?: boolean;
}

async function getCollection() {
  const client = await clientPromise;
  return client.db().collection<TicketMessage>('ticket_messages');
}

export const ticketMessageRepository = {
  async createMessage(data: Omit<TicketMessage, '_id' | 'createdAt'> & { createdAt?: Date }) {
    const collection = await getCollection();
    const doc: TicketMessage = {
      ...data,
      createdAt: data.createdAt || new Date(),
    };
    const result = await collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async getMessagesForTicket(ticketId: string, limit = 50) {
    const collection = await getCollection();
    return collection
      .find({ ticketId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
  },

  async getRecentMessagesForOrganization(organizationId: string, limit = 20) {
    const collection = await getCollection();
    return collection
      .find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },
};
