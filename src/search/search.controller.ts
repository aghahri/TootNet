import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('networks')
  searchNetworks(@Query() query: SearchQueryDto) {
    return this.search.searchNetworks(query);
  }

  @Get('groups')
  searchGroups(@Query() query: SearchQueryDto) {
    return this.search.searchGroups(query);
  }

  @Get('channels')
  searchChannels(@Query() query: SearchQueryDto) {
    return this.search.searchChannels(query);
  }

  @Get('all')
  searchAll(@Query() query: SearchQueryDto) {
    return this.search.searchAll(query);
  }
}

