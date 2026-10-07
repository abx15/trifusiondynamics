import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Actor } from '../../../common/auth/actor.decorator';
import type { ActorContext } from '../../../common/auth/actor.decorator';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { OutboxProcessorService } from '../../../common/events/outbox-processor.service';

export class OutboxQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Operational surface for the outbox dead-letter queue.
 *
 * The processor is automatic; these endpoints exist so an
 * operator can see events that exhausted their retry
 * budget and put them back into play.
 */
@Controller('outbox')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OutboxController {
  constructor(private readonly processor: OutboxProcessorService) {}

  @Get('events')
  @RequirePermission('super_admin:all')
  listEvents(@Actor() actor: ActorContext, @Query() query: OutboxQueryDto) {
    return this.processor.listDead(actor, {
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('events/:id/retry')
  @RequirePermission('super_admin:all')
  retry(@Param('id') id: string, @Actor() actor: ActorContext) {
    return this.processor.retry(actor, id);
  }
}
