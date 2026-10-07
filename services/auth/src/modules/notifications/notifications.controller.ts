import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Actor } from '../../common/auth/actor.decorator';
import type { ActorContext } from '../../common/auth/actor.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification.dto';

/**
 * Self-scoped notification inbox.
 *
 * Every query and mutation is constrained to the JWT-derived
 * user id, so these endpoints need no permission grant — a user
 * can only ever reach their own rows.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Actor() actor: ActorContext, @Query() query: NotificationQueryDto) {
    return this.notifications.list(actor, {
      unreadOnly: query.unreadOnly === true,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('unread-count')
  unreadCount(@Actor() actor: ActorContext) {
    return this.notifications.unreadCount(actor);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.notifications.markRead(actor, id);
  }

  @Patch('read-all')
  markAllRead(@Actor() actor: ActorContext) {
    return this.notifications.markAllRead(actor);
  }
}
