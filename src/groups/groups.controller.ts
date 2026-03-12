import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GroupsService } from './groups.service';
import { MessagesService } from '../messages/messages.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMessageDto } from '../messages/dto/create-message.dto';
import { PaginationQueryDto } from '../messages/dto/pagination-query.dto';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly messages: MessagesService,
  ) {}

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groups.create(userId, dto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.groups.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.update(id, userId, dto);
  }

  @Post(':id/join')
  join(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.groups.join(id, userId);
  }

  @Get(':id/members')
  getMembers(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.groups.getMembers(id, userId);
  }

  @Post(':id/members/:memberUserId/promote')
  promoteMember(
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.groups.promoteMember(id, memberUserId, userId);
  }

  @Post(':id/members/:memberUserId/demote')
  demoteMember(
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.groups.demoteMember(id, memberUserId, userId);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post(':id/messages')
  createMessage(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messages.createGroupMessage(id, userId, dto);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.messages.getGroupMessages(id, userId, query);
  }

  @Delete(':id/messages/:messageId')
  deleteMessage(
    @Param('id') groupId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messages.deleteGroupMessage(groupId, messageId, userId);
  }
}
