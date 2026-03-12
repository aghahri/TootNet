import { Controller, Get, Param, Query } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('discover')
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  @Public()
  @Get('networks')
  getNetworks(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : undefined;
    return this.discover.getNetworks(Number.isFinite(n) ? n : undefined);
  }

  @Public()
  @Get('networks/:id')
  getNetwork(@Param('id') id: string) {
    return this.discover.getNetworkById(id);
  }

  @Public()
  @Get('networks/:id/groups')
  getNetworkGroups(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? parseInt(limit, 10) : undefined;
    return this.discover.getNetworkGroups(id, Number.isFinite(n) ? n : undefined);
  }

  @Public()
  @Get('networks/:id/channels')
  getNetworkChannels(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? parseInt(limit, 10) : undefined;
    return this.discover.getNetworkChannels(id, Number.isFinite(n) ? n : undefined);
  }
}
