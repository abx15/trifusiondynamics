import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { Tx } from '../../common/prisma/unit-of-work.service';
import { ActorContext } from '../../common/auth/actor.decorator';
import { isUniqueViolation } from '../../common/events/outbox.publisher';
import {
  PaginatedResult,
  paginatedResult,
  parsePagination,
} from '../../common/utils/pagination';

export interface NotificationEntry {
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  severity?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  /**
   * Makes creation idempotent: the same key for the same user
   * can only ever produce one row (enforced by the
   * `@@unique([userId, dedupeKey])` constraint). Producers pass
   * the outbox event's idempotency key here so a replayed event
   * can never duplicate a notification.
   */
  dedupeKey?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a notification inside the caller's transaction.
   *
   * Returns the created row, or `null` when a row with the same
   * (userId, dedupeKey) already exists — the duplicate is the
   * desired outcome for retried producers, not an error.
   */
  async record(tx: Tx, entry: NotificationEntry): Promise<Notification | null> {
    try {
      return await tx.notification.create({
        data: {
          userId: entry.userId,
          organizationId: entry.organizationId,
          type: entry.type,
          title: entry.title,
          message: entry.message,
          severity: entry.severity ?? 'info',
          entityType: entry.entityType,
          entityId: entry.entityId,
          actionUrl: entry.actionUrl,
          ...(entry.dedupeKey ? { dedupeKey: entry.dedupeKey } : {}),
        },
      });
    } catch (error) {
      if (entry.dedupeKey && isUniqueViolation(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * The actor's own inbox, newest first. Always scoped to the
   * JWT-derived user AND organization — a user can never read
   * another user's notifications, even inside the same tenant.
   */
  async list(
    actor: ActorContext,
    options: {
      unreadOnly?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedResult<Notification>> {
    const { skip, take, page, limit } = parsePagination(
      options.page,
      options.limit,
    );
    const where: Prisma.NotificationWhereInput = {
      userId: actor.userId,
      organizationId: actor.organizationId,
      ...(options.unreadOnly ? { isRead: false } : {}),
    };

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return paginatedResult(notifications, total, page, limit);
  }

  /** Unread count for the actor (badge in the UI). */
  async unreadCount(actor: ActorContext): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId: actor.userId,
        organizationId: actor.organizationId,
        isRead: false,
      },
    });
    return { count };
  }

  /**
   * Marks one notification read. The update is scoped to the
   * actor's user id, so a guessed notification id from another
   * user (or another tenant) is a 404, never a cross-user write.
   */
  async markRead(actor: ActorContext, id: string): Promise<Notification> {
    const updated = await this.prisma.notification.updateMany({
      where: {
        id,
        userId: actor.userId,
        organizationId: actor.organizationId,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    if (updated.count === 0) {
      // Distinguish "already read" from "not found" only after
      // proving the row belongs to this user.
      const existing = await this.prisma.notification.findFirst({
        where: {
          id,
          userId: actor.userId,
          organizationId: actor.organizationId,
        },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundException('Notification not found');
      }
      throw new BadRequestException('Notification is already read');
    }

    return this.prisma.notification.findUniqueOrThrow({ where: { id } });
  }

  /** Marks every notification in the actor's inbox read. */
  async markAllRead(actor: ActorContext): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: actor.userId,
        organizationId: actor.organizationId,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
    return { count: result.count };
  }
}
