import { EventEmitter } from 'events';
import * as jwt from 'jsonwebtoken';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocket } from 'ws';
import { TicketEventsGateway } from './ticket-events.gateway';
import { DomainEventEnvelope } from '../common/events/domain-event.interface';
import { TicketAuthorizationService } from '../modules/helpdesk/tickets/ticket-authorization.service';
import { blockAccessToken } from '../modules/auth/access-token-blocklist';
import { redisService } from '../modules/database/redis.service';

const SECRET = 'gateway-test-secret-with-minimum-length-32!!';

const AUTH_TIMEOUT_MS = 10_000;

let tokenSeq = 0;

function buildToken(
  sub = 'user-1',
  orgId = 'org-1',
  roles = ['agent'],
): string {
  return jwt.sign(
    {
      sub,
      orgId,
      roles,
      permissions: [],
      email: `${sub}@test.com`,
      jti: `test-${++tokenSeq}`,
    },
    SECRET,
    { expiresIn: '1h' },
  );
}

function createSocket() {
  const socket = new EventEmitter() as EventEmitter & {
    readyState: number;
    sent: string[];
    closeCode: number | null;
    send: (data: string) => void;
    close: (code?: number) => void;
  };
  socket.readyState = WebSocket.OPEN;
  socket.sent = [];
  socket.closeCode = null;
  socket.send = (data: string) => {
    socket.sent.push(data);
  };
  socket.close = (code?: number) => {
    socket.closeCode = code ?? 1000;
    socket.readyState = WebSocket.CLOSED;
    socket.emit('close');
  };
  return socket;
}

function lastMessage(socket: ReturnType<typeof createSocket>) {
  return JSON.parse(socket.sent[socket.sent.length - 1]);
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function buildEnvelope(
  overrides: Record<string, unknown> = {},
): DomainEventEnvelope {
  return {
    eventId: 'evt-1',
    eventType: 'ticket.assigned',
    organizationId: 'org-1',
    correlationId: 'corr-1',
    actorId: 'user-1',
    occurredAt: new Date().toISOString(),
    data: {
      ticketId: 'ticket-1',
      requesterId: 'user-2',
      assignedAgentId: 'user-3',
    },
    ...overrides,
  };
}

describe('TicketEventsGateway', () => {
  let gateway: TicketEventsGateway;
  let httpServer: EventEmitter;
  let authorization: {
    loadVisibleTicket: jest.Mock;
    resolveAccess: jest.Mock;
    assertCanRead: jest.Mock;
  };

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = SECRET;
  });

  afterAll(() => {
    delete process.env.JWT_ACCESS_SECRET;
  });

  beforeEach(() => {
    httpServer = new EventEmitter();
    authorization = {
      loadVisibleTicket: jest.fn(),
      resolveAccess: jest.fn(),
      assertCanRead: jest.fn(),
    };
    gateway = new TicketEventsGateway(
      {
        httpAdapter: { getHttpServer: () => httpServer },
      } as unknown as HttpAdapterHost,
      authorization as unknown as TicketAuthorizationService,
    );
    gateway.onModuleInit();
  });

  afterEach(() => {
    gateway.onModuleDestroy();
  });

  function connect(socket: ReturnType<typeof createSocket>): void {
    gateway['wss'].emit('connection', socket);
  }

  function upgrade(url: string, socket: { destroy: jest.Mock }): void {
    httpServer.emit('upgrade', { url }, socket, Buffer.alloc(0));
  }

  function send(
    socket: ReturnType<typeof createSocket>,
    message: Record<string, unknown>,
  ): void {
    socket.emit('message', Buffer.from(JSON.stringify(message)));
  }

  async function authenticate(
    socket: ReturnType<typeof createSocket>,
    sub = 'user-1',
  ): Promise<void> {
    connect(socket);
    send(socket, { type: 'auth', token: buildToken(sub) });
    await flush();
  }

  async function subscribe(
    socket: ReturnType<typeof createSocket>,
    ticketId = 'ticket-1',
  ): Promise<void> {
    authorization.loadVisibleTicket.mockResolvedValue({
      id: ticketId,
      organizationId: 'org-1',
    });
    authorization.resolveAccess.mockResolvedValue({
      ticket: { id: ticketId },
      capabilities: ['agent'],
      employeeId: null,
      isAssignee: false,
      isPrimaryAssignee: false,
      isRequester: false,
      isOwnClient: false,
    });
    authorization.assertCanRead.mockResolvedValue(undefined);
    send(socket, { type: 'subscribe', ticketId });
    await flush();
  }

  describe('authentication', () => {
    it('authenticates a valid token and joins the user room', async () => {
      const socket = createSocket();
      connect(socket);
      send(socket, { type: 'auth', token: buildToken('user-7') });
      await flush();

      const message = lastMessage(socket);
      expect(message.type).toBe('auth_ok');
      expect(message.data.userId).toBe('user-7');
      expect(message.data.organizationId).toBe('org-1');
      expect(typeof message.timestamp).toBe('number');

      gateway.publish(
        buildEnvelope({
          data: { ticketId: 'ticket-1', requesterId: 'user-7' },
        }),
      );
      expect(socket.sent).toHaveLength(2);
      expect(JSON.parse(socket.sent[1]).type).toBe('ticket.assigned');
    });

    it('rejects an invalid token', async () => {
      const socket = createSocket();
      connect(socket);
      send(socket, { type: 'auth', token: 'not-a-token' });
      await flush();

      const message = lastMessage(socket);
      expect(message.type).toBe('error');
      expect(message.data.message).toBe('Invalid or expired token');
    });

    it('rejects a logged-out session', async () => {
      const token = buildToken();
      await blockAccessToken(token, redisService);

      const socket = createSocket();
      connect(socket);
      send(socket, { type: 'auth', token });
      await flush();

      const message = lastMessage(socket);
      expect(message.type).toBe('error');
      expect(message.data.message).toBe('Session has been logged out');
    });

    it('requires a token', async () => {
      const socket = createSocket();
      connect(socket);
      send(socket, { type: 'auth' });
      await flush();

      expect(lastMessage(socket).data.message).toBe('Token required');
    });

    it('closes the socket when authentication times out', () => {
      jest.useFakeTimers();
      try {
        const socket = createSocket();
        connect(socket);
        jest.advanceTimersByTime(AUTH_TIMEOUT_MS + 1);
        expect(socket.closeCode).toBe(4001);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('subscribe', () => {
    it('joins the ticket room when read access is granted', async () => {
      const socket = createSocket();
      await authenticate(socket);
      await subscribe(socket);

      const message = lastMessage(socket);
      expect(message.type).toBe('subscribed');
      expect(message.data.ticketId).toBe('ticket-1');
      expect(message.data.capabilities).toEqual(['agent']);

      gateway.publish(buildEnvelope());
      expect(socket.sent).toHaveLength(3);
      expect(JSON.parse(socket.sent[2]).data.data.ticketId).toBe('ticket-1');
    });

    it('denies the room when read access is forbidden', async () => {
      const socket = createSocket();
      await authenticate(socket);

      authorization.loadVisibleTicket.mockResolvedValue({
        id: 'ticket-1',
        organizationId: 'org-1',
      });
      authorization.resolveAccess.mockResolvedValue({
        ticket: { id: 'ticket-1' },
        capabilities: [],
      });
      authorization.assertCanRead.mockRejectedValue(
        new ForbiddenException('No access'),
      );
      send(socket, { type: 'subscribe', ticketId: 'ticket-1' });
      await flush();

      expect(lastMessage(socket).data.message).toBe(
        'You do not have access to this ticket',
      );

      gateway.publish(buildEnvelope());
      expect(socket.sent).toHaveLength(2);
    });

    it('reports unknown tickets', async () => {
      const socket = createSocket();
      await authenticate(socket);

      authorization.loadVisibleTicket.mockRejectedValue(
        new NotFoundException('Ticket not found'),
      );
      send(socket, { type: 'subscribe', ticketId: 'missing' });
      await flush();

      expect(lastMessage(socket).data.message).toBe('Ticket not found');
    });

    it('requires authentication first', async () => {
      const socket = createSocket();
      connect(socket);
      send(socket, { type: 'subscribe', ticketId: 'ticket-1' });
      await flush();

      expect(lastMessage(socket).data.message).toBe('Authentication required');
    });

    it('leaves the room on unsubscribe', async () => {
      const socket = createSocket();
      await authenticate(socket);
      await subscribe(socket);

      send(socket, { type: 'unsubscribe', ticketId: 'ticket-1' });
      await flush();

      expect(lastMessage(socket).type).toBe('unsubscribed');

      gateway.publish(buildEnvelope());
      expect(socket.sent).toHaveLength(3);
    });
  });

  describe('publish', () => {
    it('broadcasts to the ticket room and recipient user rooms', async () => {
      const requester = createSocket();
      await authenticate(requester, 'user-2');

      const viewer = createSocket();
      await authenticate(viewer, 'user-1');
      await subscribe(viewer);

      const stranger = createSocket();
      await authenticate(stranger, 'user-9');

      gateway.publish(buildEnvelope());

      expect(requester.sent).toHaveLength(2);
      expect(viewer.sent).toHaveLength(3);
      expect(stranger.sent).toHaveLength(1);

      const pushed = JSON.parse(requester.sent[1]);
      expect(pushed.type).toBe('ticket.assigned');
      expect(pushed.data.eventId).toBe('evt-1');
      expect(pushed.data.data.ticketId).toBe('ticket-1');
      expect(typeof pushed.timestamp).toBe('number');
    });

    it('ignores envelopes without a ticketId', async () => {
      const socket = createSocket();
      await authenticate(socket, 'user-2');

      gateway.publish(buildEnvelope({ data: { requesterId: 'user-2' } }));

      expect(socket.sent).toHaveLength(1);
    });
  });

  describe('message handling', () => {
    it('destroys upgrades for paths other than /ws', () => {
      const socket = { destroy: jest.fn() };
      upgrade('/api/other', socket);

      expect(socket.destroy).toHaveBeenCalledTimes(1);
    });

    it('rejects oversized messages', () => {
      const socket = createSocket();
      connect(socket);
      socket.emit('message', Buffer.alloc(64 * 1024 + 1));

      expect(socket.closeCode).toBe(4003);
    });

    it('rejects invalid JSON', async () => {
      const socket = createSocket();
      connect(socket);
      socket.emit('message', Buffer.from('{not json'));
      await flush();

      expect(lastMessage(socket).data.message).toBe('Invalid JSON');
    });

    it('rejects unknown message types', async () => {
      const socket = createSocket();
      await authenticate(socket);
      send(socket, { type: 'ping' });
      await flush();

      expect(lastMessage(socket).data.message).toBe(
        'Unknown message type: ping',
      );
    });

    it('rejects messages without a type', async () => {
      const socket = createSocket();
      connect(socket);
      send(socket, { token: buildToken() });
      await flush();

      expect(lastMessage(socket).data.message).toBe(
        'Message must have a string type',
      );
    });
  });
});
