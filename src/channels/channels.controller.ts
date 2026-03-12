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
import { ChannelsService } from './channels.service';
import { MessagesService } from '../messages/messages.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMessageDto } from '../messages/dto/create-message.dto';
import { PaginationQueryDto } from '../messages/dto/pagination-query.dto';

@Controller('channels')
export class ChannelsController {
  constructor(
    private readonly channels: ChannelsService,
    private readonly messages: MessagesService,
  ) {}

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channels.create(userId, dto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channels.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channels.update(id, userId, dto);
  }

  @Post(':id/join')
  join(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channels.join(id, userId);
  }

  @Get(':id/members')
  getMembers(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channels.getMembers(id, userId);
  }

  @Post(':id/members/:memberUserId/promote')
  promoteMember(
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channels.promoteMember(id, memberUserId, userId);
  }

  @Post(':id/members/:memberUserId/demote')
  demoteMember(
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channels.demoteMember(id, memberUserId, userId);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post(':id/messages')
  createMessage(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messages.createChannelMessage(id, userId, dto);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.messages.getChannelMessages(id, userId, query);
  }

  @Delete(':id/messages/:messageId')
  deleteMessage(
    @Param('id') channelId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messages.deleteChannelMessage(channelId, messageId, userId);
  }
}
