import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 30;
    const o = offset ? parseInt(offset, 10) : 0;
    return this.notifications.findAll(userId, Number.isFinite(l) ? l : 30, Number.isFinite(o) ? o : 0);
  }

  @Post(':id/read')
  markRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }
}
