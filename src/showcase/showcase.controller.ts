import { Controller, Get, Query } from '@nestjs/common';
import { ShowcaseService } from './showcase.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('showcase')
export class ShowcaseController {
  constructor(private readonly showcase: ShowcaseService) {}

  @Public()
  @Get()
  getShowcase() {
    return this.showcase.getShowcase();
  }

  @Public()
  @Get('announcements')
  getAnnouncements(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : undefined;
    return this.showcase.getAnnouncementsList(Number.isFinite(n) ? n : undefined);
  }
}
