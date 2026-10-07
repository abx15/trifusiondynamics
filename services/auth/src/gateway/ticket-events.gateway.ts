import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { IncomingMessage as HttpIncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '@agency-os/types';
import { isAccessTokenBlocked } from '../modules/auth/access-token-blocklist';
import { redisService } from '../modules/database/redis.service';
import { TicketAuthorizationService } from '../modules/helpdesk/tickets/ticket-authorization.service';
import {
  ActorContext,
  buildActorContext,
} from '../common/auth/actor.decorator';
import { DomainEventEnvelope } from '../common/events/domain-event.interface';

const WS_PATH = '/ws';
const AUTH_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_BYTES = 64 * 1024;

const CLOSE_AUTH_TIMEOUT = 4001;
const CLOSE_MESSAGE_TOO_LARGE = 4003;

const RECIPIENT_FIELDS = [
  'requesterId',
  'assignedAgentId',
  'submittedById',
  'verifiedById',
  'createdBy',
];

interface ClientState {
  actor: ActorContext | null;
  rooms: Set<string>;
  authTimer: ReturnType<typeof setTimeout> | null;
}

interface ClientMessage {
  type?: unknown;
  token?: unknown;
  ticketId?: unknown;
}

/**
 * Realtime fan-out of outbox domain events to browser clients.
 *
 * The outbox processor calls {@link publish} after a durable side
 * effect (webhook delivery) succeeds; connected clients receive the
 * envelope on the rooms they joined:
 *
 *   user:{userId}     — joined automatically at authentication
 *   ticket:{ticketId} — joined via an authorized `subscribe` message
 *
 * Subscription is the authorization boundary: `loadVisibleTenant`
 * (tenant isolation) and `assertCanRead` run server-side per
 * subscribe, so a client can never join a room it may not read.
 *
 * The frontend connects to `/ws` with a native WebSocket, sends
 * `{ type: "auth", token }` after open, and consumes messages shaped
 * `{ type, data, timestamp }` — the same shape as
 * `useWebSocket` in apps/admin-dashboard/lib/websocket.ts.
 *
 * Delivery is at-most-once and ephemeral: messages carry the outbox
 * `eventId` so clients can dedupe against the durable notification
 * feed when a connection drops mid-event.
 */
@Injectable()
export class TicketEventsGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TicketEventsGateway.name);
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly clients = new Map<WebSocket, ClientState>();
  private readonly rooms = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly authorization: TicketAuthorizationService,
  ) {}

  onModuleInit(): void {
    const server = this.httpAdapterHost.httpAdapter.getHttpServer();

    server.on(
      'upgrade',
      (req: HttpIncomingMessage, socket: Duplex, head: Buffer) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (pathname !== WS_PATH) {
          socket.destroy();
          return;
        }
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      },
    );

    this.wss.on('connection', (ws) => this.handleConnection(ws));
  }

  onModuleDestroy(): void {
    for (const ws of [...this.clients.keys()]) {
      ws.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    this.rooms.clear();
  }

  /**
   * Pushes one outbox envelope to every room it concerns:
   * the ticket's room plus the personal rooms of the users the
   * event names. Never throws — a fan-out failure must not mark a
   * delivered event as failed.
   */
  publish(envelope: DomainEventEnvelope): void {
    try {
      const data = envelope.data as Record<string, unknown> | null | undefined;
      const ticketId =
        typeof data?.ticketId === 'string' ? data.ticketId : null;
      if (!ticketId) return;

      const message = JSON.stringify({
        type: envelope.eventType,
        data: envelope,
        timestamp: Date.now(),
      });

      this.broadcast(`ticket:${ticketId}`, message);

      const recipients = new Set<string>();
      for (const field of RECIPIENT_FIELDS) {
        const value = data?.[field];
        if (typeof value === 'string' && value.length > 0) {
          recipients.add(value);
        }
      }
      for (const userId of recipients) {
        this.broadcast(`user:${userId}`, message);
      }
    } catch (error) {
      this.logger.error(
        `WebSocket publish failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private handleConnection(ws: WebSocket): void {
    const state: ClientState = {
      actor: null,
      rooms: new Set(),
      authTimer: setTimeout(() => {
        this.logger.debug('WebSocket closed: authentication timeout');
        ws.close(CLOSE_AUTH_TIMEOUT, 'Authentication required');
      }, AUTH_TIMEOUT_MS),
    };
    this.clients.set(ws, state);

    ws.on('message', (raw: Buffer) => {
      void this.handleMessage(ws, state, raw).catch((error) => {
        this.logger.error(
          `WebSocket message handling failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    });
    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', (error: Error) => {
      this.logger.warn(`WebSocket error: ${error.message}`);
    });
  }

  private async handleMessage(
    ws: WebSocket,
    state: ClientState,
    raw: Buffer,
  ): Promise<void> {
    if (ws.readyState !== WebSocket.OPEN) return;

    if (raw.length > MAX_MESSAGE_BYTES) {
      ws.close(CLOSE_MESSAGE_TOO_LARGE, 'Message too large');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      this.send(ws, {
        type: 'error',
        data: { message: 'Invalid JSON' },
      });
      return;
    }

    const message = parsed as ClientMessage;
    if (!message || typeof message.type !== 'string') {
      this.send(ws, {
        type: 'error',
        data: { message: 'Message must have a string type' },
      });
      return;
    }

    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, state, message);
        return;
      case 'subscribe':
        await this.handleSubscribe(ws, state, message);
        return;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, state, message);
        return;
      default:
        this.send(ws, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` },
        });
    }
  }

  private async handleAuth(
    ws: WebSocket,
    state: ClientState,
    message: ClientMessage,
  ): Promise<void> {
    if (state.actor) {
      this.send(ws, {
        type: 'error',
        data: { message: 'Already authenticated' },
      });
      return;
    }

    if (typeof message.token !== 'string' || message.token.length === 0) {
      this.send(ws, {
        type: 'error',
        data: { message: 'Token required' },
      });
      return;
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      this.send(ws, {
        type: 'error',
        data: { message: 'Server misconfigured: JWT_ACCESS_SECRET not set' },
      });
      return;
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(message.token, secret) as JwtPayload;
    } catch {
      this.send(ws, {
        type: 'error',
        data: { message: 'Invalid or expired token' },
      });
      return;
    }

    if (await isAccessTokenBlocked(message.token, redisService)) {
      this.send(ws, {
        type: 'error',
        data: { message: 'Session has been logged out' },
      });
      return;
    }

    state.actor = buildActorContext(payload);
    if (state.authTimer) {
      clearTimeout(state.authTimer);
      state.authTimer = null;
    }

    this.joinRoom(ws, state, `user:${state.actor.userId}`);
    this.send(ws, {
      type: 'auth_ok',
      data: {
        userId: state.actor.userId,
        organizationId: state.actor.organizationId,
      },
    });
  }

  private async handleSubscribe(
    ws: WebSocket,
    state: ClientState,
    message: ClientMessage,
  ): Promise<void> {
    if (!state.actor) {
      this.send(ws, {
        type: 'error',
        data: { message: 'Authentication required' },
      });
      return;
    }

    if (typeof message.ticketId !== 'string' || message.ticketId.length === 0) {
      this.send(ws, {
        type: 'error',
        data: { message: 'ticketId required' },
      });
      return;
    }

    const ticketId = message.ticketId;
    const actor = state.actor;

    try {
      const ticket = await this.authorization.loadVisibleTicket(
        actor,
        ticketId,
      );
      const access = await this.authorization.resolveAccess(actor, ticket);
      await this.authorization.assertCanRead(actor, access);

      this.joinRoom(ws, state, `ticket:${ticketId}`);
      this.send(ws, {
        type: 'subscribed',
        data: { ticketId, capabilities: access.capabilities },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.send(ws, {
          type: 'error',
          data: { message: 'Ticket not found' },
        });
      } else if (error instanceof ForbiddenException) {
        this.send(ws, {
          type: 'error',
          data: { message: 'You do not have access to this ticket' },
        });
      } else {
        this.logger.error(
          `Ticket subscription failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        this.send(ws, {
          type: 'error',
          data: { message: 'Subscription failed' },
        });
      }
    }
  }

  private handleUnsubscribe(
    ws: WebSocket,
    state: ClientState,
    message: ClientMessage,
  ): void {
    if (!state.actor) {
      this.send(ws, {
        type: 'error',
        data: { message: 'Authentication required' },
      });
      return;
    }

    if (typeof message.ticketId !== 'string' || message.ticketId.length === 0) {
      this.send(ws, {
        type: 'error',
        data: { message: 'ticketId required' },
      });
      return;
    }

    this.leaveRoom(ws, state, `ticket:${message.ticketId}`);
    this.send(ws, {
      type: 'unsubscribed',
      data: { ticketId: message.ticketId },
    });
  }

  private handleDisconnect(ws: WebSocket): void {
    const state = this.clients.get(ws);
    if (!state) return;

    if (state.authTimer) {
      clearTimeout(state.authTimer);
      state.authTimer = null;
    }
    for (const room of [...state.rooms]) {
      this.leaveRoom(ws, state, room);
    }
    this.clients.delete(ws);
  }

  private joinRoom(ws: WebSocket, state: ClientState, room: string): void {
    if (state.rooms.has(room)) return;

    state.rooms.add(room);
    let members = this.rooms.get(room);
    if (!members) {
      members = new Set();
      this.rooms.set(room, members);
    }
    members.add(ws);
  }

  private leaveRoom(ws: WebSocket, state: ClientState, room: string): void {
    state.rooms.delete(room);

    const members = this.rooms.get(room);
    if (!members) return;

    members.delete(ws);
    if (members.size === 0) {
      this.rooms.delete(room);
    }
  }

  private broadcast(room: string, message: string): void {
    const members = this.rooms.get(room);
    if (!members) return;

    for (const ws of members) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      try {
        ws.send(message);
      } catch (error) {
        this.logger.warn(
          `Failed to send to a WebSocket client: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private send(ws: WebSocket, message: { type: string; data: unknown }): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ ...message, timestamp: Date.now() }));
  }
}
