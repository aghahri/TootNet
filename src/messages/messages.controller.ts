import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ReactionDto } from './dto/reaction.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Patch('group/:messageId')
  updateGroupMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messages.updateGroupMessageByMessageId(messageId, userId, dto);
  }

  @Patch('channel/:messageId')
  updateChannelMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messages.updateChannelMessageByMessageId(messageId, userId, dto);
  }

  @Delete('group/:messageId')
  softDeleteGroupMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messages.softDeleteGroupMessageByMessageId(messageId, userId);
  }

  @Delete('channel/:messageId')
  softDeleteChannelMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messages.softDeleteChannelMessageByMessageId(messageId, userId);
  }

  @Post('group/:messageId/reactions')
  addGroupReaction(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ReactionDto,
  ) {
    return this.messages.addGroupReaction(messageId, userId, dto.emoji);
  }

  @Delete('group/:messageId/reactions/:emoji')
  removeGroupReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messages.removeGroupReaction(messageId, userId, emoji);
  }

  @Post('channel/:messageId/reactions')
  addChannelReaction(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ReactionDto,
  ) {
    return this.messages.addChannelReaction(messageId, userId, dto.emoji);
  }

  @Delete('channel/:messageId/reactions/:emoji')
  removeChannelReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messages.removeChannelReaction(messageId, userId, emoji);
  }
}
