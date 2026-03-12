import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../messages/messages.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateMessageDto } from '../messages/dto/create-message.dto';

const ROOM_GROUP = (id: string) => `group:${id}`;
const ROOM_CHANNEL = (id: string) => `channel:${id}`;

interface AuthenticatedSocket extends import('socket.io').Socket {
  data: { userId?: string };
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly messages: MessagesService,
    private readonly permissions: PermissionsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const secret = this.config.get<string>('JWT_SECRET');
      const payload = await this.jwt.verifyAsync<{ sub: string; type?: string }>(token, {
        secret,
      });
      if (payload.type === 'refresh') {
        client.disconnect();
        return;
      }
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  private getUserId(client: AuthenticatedSocket): string {
    const userId = client.data.userId;
    if (!userId) {
      throw new Error('Unauthorized');
    }
    return userId;
  }

  @SubscribeMessage('join_group')
  async handleJoinGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { groupId: string },
  ) {
    const userId = this.getUserId(client);
    if (!payload?.groupId) return;
    await this.permissions.ensureGroupMember(userId, payload.groupId);
    await client.join(ROOM_GROUP(payload.groupId));
  }

  @SubscribeMessage('leave_group')
  async handleLeaveGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { groupId: string },
  ) {
    if (!payload?.groupId) return;
    await client.leave(ROOM_GROUP(payload.groupId));
  }

  @SubscribeMessage('group_message')
  async handleGroupMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { groupId: string; content?: string; mediaId?: string; replyToMessageId?: string },
  ) {
    const userId = this.getUserId(client);
    if (!body?.groupId) return;
    const content = body.content != null ? String(body.content).trim() : '';
    const mediaId = body.mediaId ? String(body.mediaId).trim() || undefined : undefined;
    const replyToMessageId = body.replyToMessageId ? String(body.replyToMessageId).trim() || undefined : undefined;
    if (!content && !mediaId && !replyToMessageId) return;
    if (content.length > 10000) return;
    const dto: CreateMessageDto = { content: content || undefined, mediaId, replyToMessageId };
    const message = await this.messages.createGroupMessage(body.groupId, userId, dto);
    this.server.to(ROOM_GROUP(body.groupId)).emit('group_message', message);
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
    const userId = this.getUserId(client);
    if (!payload?.channelId) return;
    await this.permissions.ensureChannelMember(userId, payload.channelId);
    await client.join(ROOM_CHANNEL(payload.channelId));
  }

  @SubscribeMessage('leave_channel')
  async handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { channelId: string },
  ) {
    if (!payload?.channelId) return;
    await client.leave(ROOM_CHANNEL(payload.channelId));
  }

  @SubscribeMessage('channel_message')
  async handleChannelMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { channelId: string; content?: string; mediaId?: string; replyToMessageId?: string },
  ) {
    const userId = this.getUserId(client);
    if (!body?.channelId) return;
    const content = body.content != null ? String(body.content).trim() : '';
    const mediaId = body.mediaId ? String(body.mediaId).trim() || undefined : undefined;
    const replyToMessageId = body.replyToMessageId ? String(body.replyToMessageId).trim() || undefined : undefined;
    if (!content && !mediaId && !replyToMessageId) return;
    if (content.length > 10000) return;
    await this.permissions.ensureChannelAdmin(userId, body.channelId);
    const dto: CreateMessageDto = { content: content || undefined, mediaId, replyToMessageId };
    const message = await this.messages.createChannelMessage(body.channelId, userId, dto);
    this.server.to(ROOM_CHANNEL(body.channelId)).emit('channel_message', message);
  }

  @SubscribeMessage('group_reaction_add')
  async handleGroupReactionAdd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { messageId: string; emoji: string; groupId: string },
  ) {
    const userId = this.getUserId(client);
    if (!body?.messageId || !body?.groupId || !body?.emoji) return;
    await this.permissions.ensureGroupMember(userId, body.groupId);
    const message = await this.messages.addGroupReaction(body.messageId, userId, body.emoji);
    this.server.to(ROOM_GROUP(body.groupId)).emit('message_reaction_added', {
      messageId: message.id,
      groupId: body.groupId,
      reactions: (message as any).reactions ?? [],
    });
  }

  @SubscribeMessage('group_reaction_remove')
  async handleGroupReactionRemove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { messageId: string; emoji: string; groupId: string },
  ) {
    const userId = this.getUserId(client);
    if (!body?.messageId || !body?.groupId || !body?.emoji) return;
    await this.permissions.ensureGroupMember(userId, body.groupId);
    const message = await this.messages.removeGroupReaction(body.messageId, userId, body.emoji);
    this.server.to(ROOM_GROUP(body.groupId)).emit('message_reaction_removed', {
      messageId: message.id,
      groupId: body.groupId,
      reactions: (message as any).reactions ?? [],
    });
  }

  @SubscribeMessage('channel_reaction_add')
  async handleChannelReactionAdd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { messageId: string; emoji: string; channelId: string },
  ) {
    const userId = this.getUserId(client);
    if (!body?.messageId || !body?.channelId || !body?.emoji) return;
    await this.permissions.ensureChannelMember(userId, body.channelId);
    const message = await this.messages.addChannelReaction(body.messageId, userId, body.emoji);
    this.server.to(ROOM_CHANNEL(body.channelId)).emit('message_reaction_added', {
      messageId: message.id,
      channelId: body.channelId,
      reactions: (message as any).reactions ?? [],
    });
  }

  @SubscribeMessage('channel_reaction_remove')
  async handleChannelReactionRemove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { messageId: string; emoji: string; channelId: string },
  ) {
    const userId = this.getUserId(client);
    if (!body?.messageId || !body?.channelId || !body?.emoji) return;
    await this.permissions.ensureChannelMember(userId, body.channelId);
    const message = await this.messages.removeChannelReaction(body.messageId, userId, body.emoji);
    this.server.to(ROOM_CHANNEL(body.channelId)).emit('message_reaction_removed', {
      messageId: message.id,
      channelId: body.channelId,
      reactions: (message as any).reactions ?? [],
    });
  }
}
