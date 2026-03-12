import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ModerationService } from './moderation.service';
import { ReportMessageDto } from './dto/report-message.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('messages')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('report')
  reportMessage(
    @CurrentUser('sub') userId: string,
    @Body() dto: ReportMessageDto,
  ) {
    return this.moderation.reportMessage(userId, dto);
  }
}
