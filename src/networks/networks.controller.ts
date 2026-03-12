import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { NetworksService } from './networks.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('networks')
export class NetworksController {
  constructor(private readonly networks: NetworksService) {}

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateNetworkDto,
  ) {
    return this.networks.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('sub') userId: string) {
    return this.networks.findAll(userId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networks.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateNetworkDto,
  ) {
    return this.networks.update(id, userId, dto);
  }

  @Post(':id/join')
  join(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networks.join(id, userId);
  }

  @Get(':id/members')
  getMembers(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networks.getMembers(id, userId);
  }

  @Post(':id/members/:memberUserId/promote')
  promoteMember(
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networks.promoteMember(id, memberUserId, userId);
  }

  @Post(':id/members/:memberUserId/demote')
  demoteMember(
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networks.demoteMember(id, memberUserId, userId);
  }

  @Post(':id/members/:memberUserId/suspend')
  suspendMember(
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networks.suspendMember(id, memberUserId, userId);
  }

  @Post(':id/members/:memberUserId/unsuspend')
  unsuspendMember(
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.networks.unsuspendMember(id, memberUserId, userId);
  }
}
