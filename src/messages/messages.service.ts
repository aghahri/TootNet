import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';
import { AuditAction, AuditResourceType } from '../audit/audit.constants';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
    private readonly media: MediaService,
  ) {}

  async createGroupMessage(groupId: string, userId: string, dto: CreateMessageDto) {
    await this.permissions.canPostInGroup(userId, groupId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, networkId: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    await this.permissions.ensureNotSuspendedInNetwork(userId, group.networkId);

    const content = dto.content?.trim() ?? '';
    const mediaId = dto.mediaId?.trim() || null;
    const replyToMessageId = dto.replyToMessageId?.trim() || null;
    if (!content && !mediaId) {
      throw new BadRequestException('Message must have content or an attachment');
    }
    if (mediaId) {
      await this.media.ensureOwnedByUser(mediaId, userId);
    }
    if (replyToMessageId) {
      const target = await this.prisma.groupMessage.findUnique({
        where: { id: replyToMessageId },
        select: { id: true, groupId: true },
      });
      if (!target || target.groupId !== groupId) {
        throw new BadRequestException('Invalid reply target for this group');
      }
    }

    const message = await this.prisma.groupMessage.create({
      data: {
        groupId,
        senderId: userId,
        content: content || '',
        mediaId,
        replyToMessageId,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        media: true,
        replyToMessage: {
          select: {
            id: true,
            senderId: true,
            content: true,
            createdAt: true,
            deletedAt: true,
            isEdited: true,
          },
        },
      },
    });

    const reactions = await this.getGroupReactionsForMessages([message.id], userId);
    return this.toMessageWithMedia({ ...message, reactions: reactions[message.id] ?? [] });
  }

  async getGroupMessages(
    groupId: string,
    userId: string,
    query: PaginationQueryDto,
  ) {
    await this.permissions.ensureGroupMember(userId, groupId);

    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = query.offset ?? 0;

    const [messages, total] = await Promise.all([
      this.prisma.groupMessage.findMany({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
          media: true,
          replyToMessage: {
            select: {
              id: true,
              senderId: true,
              content: true,
              createdAt: true,
              deletedAt: true,
              isEdited: true,
            },
          },
        },
      }),
      this.prisma.groupMessage.count({ where: { groupId } }),
    ]);

    const ordered = messages.reverse(); // oldest first
    const reactions = await this.getGroupReactionsForMessages(
      ordered.map((m) => m.id),
      userId,
    );

    return {
      data: ordered.map((m) =>
        this.toMessageWithMedia({ ...m, reactions: reactions[m.id] ?? [] }),
      ),
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + messages.length < total,
      },
    };
  }

  async createChannelMessage(channelId: string, userId: string, dto: CreateMessageDto) {
    await this.permissions.ensureChannelAdmin(userId, channelId);

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, networkId: true },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    await this.permissions.ensureNotSuspendedInNetwork(userId, channel.networkId);

    const content = dto.content?.trim() ?? '';
    const mediaId = dto.mediaId?.trim() || null;
    const replyToMessageId = dto.replyToMessageId?.trim() || null;
    if (!content && !mediaId) {
      throw new BadRequestException('Message must have content or an attachment');
    }
    if (mediaId) {
      await this.media.ensureOwnedByUser(mediaId, userId);
    }
    if (replyToMessageId) {
      const target = await this.prisma.channelMessage.findUnique({
        where: { id: replyToMessageId },
        select: { id: true, channelId: true },
      });
      if (!target || target.channelId !== channelId) {
        throw new BadRequestException('Invalid reply target for this channel');
      }
    }

    const message = await this.prisma.channelMessage.create({
      data: {
        channelId,
        senderId: userId,
        content: content || '',
        mediaId,
        replyToMessageId,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        media: true,
        replyToMessage: {
          select: {
            id: true,
            senderId: true,
            content: true,
            createdAt: true,
            deletedAt: true,
            isEdited: true,
          },
        },
      },
    });

    const reactions = await this.getChannelReactionsForMessages([message.id], userId);
    return this.toMessageWithMedia({ ...message, reactions: reactions[message.id] ?? [] });
  }

  async getChannelMessages(
    channelId: string,
    userId: string,
    query: PaginationQueryDto,
  ) {
    await this.permissions.ensureChannelMember(userId, channelId);

    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = query.offset ?? 0;

    const [messages, total] = await Promise.all([
      this.prisma.channelMessage.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
          media: true,
          replyToMessage: {
            select: {
              id: true,
              senderId: true,
              content: true,
              createdAt: true,
              deletedAt: true,
              isEdited: true,
            },
          },
        },
      }),
      this.prisma.channelMessage.count({ where: { channelId } }),
    ]);

    const ordered = messages.reverse();
    const reactions = await this.getChannelReactionsForMessages(
      ordered.map((m) => m.id),
      userId,
    );

    return {
      data: ordered.map((m) =>
        this.toMessageWithMedia({ ...m, reactions: reactions[m.id] ?? [] }),
      ),
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + messages.length < total,
      },
    };
  }

  async deleteGroupMessage(groupId: string, messageId: string, userId: string) {
    const message = await this.prisma.groupMessage.findFirst({
      where: { id: messageId, groupId },
      select: { id: true, groupId: true, senderId: true, deletedAt: true, group: { select: { networkId: true } } },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.permissions.ensureCanDeleteGroupMessage(userId, groupId, message);

    await this.prisma.groupMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedByUserId: userId },
    });
    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.GROUP_MESSAGE_SOFT_DELETED,
      resourceType: AuditResourceType.GROUP_MESSAGE,
      resourceId: messageId,
      metadata: { groupId, networkId: message.group.networkId },
    });
    return { deleted: true, id: messageId };
  }

  async deleteChannelMessage(channelId: string, messageId: string, userId: string) {
    const message = await this.prisma.channelMessage.findFirst({
      where: { id: messageId, channelId },
      select: { id: true, channelId: true, senderId: true, deletedAt: true, channel: { select: { networkId: true } } },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.permissions.ensureCanDeleteChannelMessage(userId, channelId, message);

    await this.prisma.channelMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedByUserId: userId },
    });
    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.CHANNEL_MESSAGE_SOFT_DELETED,
      resourceType: AuditResourceType.CHANNEL_MESSAGE,
      resourceId: messageId,
      metadata: { channelId, networkId: message.channel.networkId },
    });
    return { deleted: true, id: messageId };
  }

  /** Edit by messageId only (message-level API). MVP: content only; mediaId is not changeable. */
  async updateGroupMessageByMessageId(messageId: string, userId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: { id: true, groupId: true, senderId: true, deletedAt: true, content: true, group: { select: { networkId: true } } },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.permissions.ensureCanEditGroupMessage(userId, message.groupId, message);

    const newContent = dto.content.trim();
    if (!newContent) {
      throw new BadRequestException('Content cannot be empty or whitespace-only');
    }

    await this.prisma.$transaction([
      this.prisma.groupMessageEdit.create({
        data: {
          messageId,
          previousContent: message.content,
          editedByUserId: userId,
        },
      }),
      this.prisma.groupMessage.update({
        where: { id: messageId },
        data: { content: newContent, isEdited: true },
      }),
    ]);

    const updated = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        media: true,
      },
    });
    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.GROUP_MESSAGE_EDITED,
      resourceType: AuditResourceType.GROUP_MESSAGE,
      resourceId: messageId,
      metadata: { groupId: message.groupId, networkId: message.group.networkId, previousContentLength: message.content.length },
    });
    return this.toMessageWithMedia(updated!);
  }

  /** Edit by messageId only (message-level API). MVP: content only; mediaId is not changeable. */
  async updateChannelMessageByMessageId(messageId: string, userId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true, senderId: true, deletedAt: true, content: true, channel: { select: { networkId: true } } },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.permissions.ensureCanEditChannelMessage(userId, message.channelId, message);

    const newContent = dto.content.trim();
    if (!newContent) {
      throw new BadRequestException('Content cannot be empty or whitespace-only');
    }

    await this.prisma.$transaction([
      this.prisma.channelMessageEdit.create({
        data: {
          messageId,
          previousContent: message.content,
          editedByUserId: userId,
        },
      }),
      this.prisma.channelMessage.update({
        where: { id: messageId },
        data: { content: newContent, isEdited: true },
      }),
    ]);

    const updated = await this.prisma.channelMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        media: true,
      },
    });
    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.CHANNEL_MESSAGE_EDITED,
      resourceType: AuditResourceType.CHANNEL_MESSAGE,
      resourceId: messageId,
      metadata: { channelId: message.channelId, networkId: message.channel.networkId, previousContentLength: message.content.length },
    });
    return this.toMessageWithMedia(updated!);
  }

  /** Soft-delete by messageId only (message-level API). */
  async softDeleteGroupMessageByMessageId(messageId: string, userId: string) {
    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: { id: true, groupId: true, senderId: true, deletedAt: true, group: { select: { networkId: true } } },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.permissions.ensureCanDeleteGroupMessage(userId, message.groupId, message);
    await this.prisma.groupMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedByUserId: userId },
    });
    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.GROUP_MESSAGE_SOFT_DELETED,
      resourceType: AuditResourceType.GROUP_MESSAGE,
      resourceId: messageId,
      metadata: { groupId: message.groupId, networkId: message.group.networkId },
    });
    return { deleted: true, id: messageId };
  }

  /** Soft-delete by messageId only (message-level API). */
  async softDeleteChannelMessageByMessageId(messageId: string, userId: string) {
    const message = await this.prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true, senderId: true, deletedAt: true, channel: { select: { networkId: true } } },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.permissions.ensureCanDeleteChannelMessage(userId, message.channelId, message);
    await this.prisma.channelMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedByUserId: userId },
    });
    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.CHANNEL_MESSAGE_SOFT_DELETED,
      resourceType: AuditResourceType.CHANNEL_MESSAGE,
      resourceId: messageId,
      metadata: { channelId: message.channelId, networkId: message.channel.networkId },
    });
    return { deleted: true, id: messageId };
  }

  async addGroupReaction(messageId: string, userId: string, rawEmoji: string) {
    const emoji = rawEmoji.trim();
    if (!emoji) {
      throw new BadRequestException('Emoji is required');
    }

    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        groupId: true,
        deletedAt: true,
        group: { select: { networkId: true } },
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.deletedAt) {
      throw new BadRequestException('Cannot react to a deleted message');
    }

    await this.permissions.ensureGroupMember(userId, message.groupId);
    await this.permissions.ensureNotSuspendedInNetwork(userId, message.group.networkId);

    await this.prisma.groupMessageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
      update: {},
      create: {
        messageId,
        userId,
        emoji,
      },
    });

    return this.getGroupMessageWithReactionsForUser(messageId, userId);
  }

  async removeGroupReaction(messageId: string, userId: string, rawEmoji: string) {
    const emoji = rawEmoji.trim();
    if (!emoji) {
      throw new BadRequestException('Emoji is required');
    }

    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        groupId: true,
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const own = await this.prisma.groupMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (own) {
      await this.prisma.groupMessageReaction.delete({
        where: { id: own.id },
      });
    } else {
      // allow admins (group/network) to remove all reactions of this emoji for moderation
      await this.permissions.ensureCanModerateGroupMessage(userId, message.groupId);
      await this.prisma.groupMessageReaction.deleteMany({
        where: { messageId, emoji },
      });
    }

    return this.getGroupMessageWithReactionsForUser(messageId, userId);
  }

  async addChannelReaction(messageId: string, userId: string, rawEmoji: string) {
    const emoji = rawEmoji.trim();
    if (!emoji) {
      throw new BadRequestException('Emoji is required');
    }

    const message = await this.prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        channelId: true,
        deletedAt: true,
        channel: { select: { networkId: true } },
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.deletedAt) {
      throw new BadRequestException('Cannot react to a deleted message');
    }

    await this.permissions.ensureChannelMember(userId, message.channelId);
    await this.permissions.ensureNotSuspendedInNetwork(userId, message.channel.networkId);

    await this.prisma.channelMessageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
      update: {},
      create: {
        messageId,
        userId,
        emoji,
      },
    });

    return this.getChannelMessageWithReactionsForUser(messageId, userId);
  }

  async removeChannelReaction(messageId: string, userId: string, rawEmoji: string) {
    const emoji = rawEmoji.trim();
    if (!emoji) {
      throw new BadRequestException('Emoji is required');
    }

    const message = await this.prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        channelId: true,
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const own = await this.prisma.channelMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (own) {
      await this.prisma.channelMessageReaction.delete({
        where: { id: own.id },
      });
    } else {
      await this.permissions.ensureCanModerateChannelMessage(userId, message.channelId);
      await this.prisma.channelMessageReaction.deleteMany({
        where: { messageId, emoji },
      });
    }

    return this.getChannelMessageWithReactionsForUser(messageId, userId);
  }

  /**
   * Normalize message for API: include lightweight media when present; mask content/media when deleted.
   * Deleted messages: content and media are null, deletedAt and deletedByUserId are set. Safe for Unicode/Persian.
   */
  private toMessageWithMedia<
    T extends {
      sender: unknown;
      content: string;
      deletedAt?: Date | null;
      deletedByUserId?: string | null;
      isEdited?: boolean;
      media?: { id: string; type: string; url: string; mimeType: string; originalName: string | null } | null;
      replyToMessage?: {
        id: string;
        senderId: string;
        content: string;
        createdAt: Date;
        deletedAt: Date | null;
        isEdited: boolean;
      } | null;
    },
  >(message: T): Omit<T, 'media' | 'replyToMessage'> & {
    content: string | null;
    media: { id: string; type: string; url: string; mimeType: string; originalName: string | null } | null;
    deletedAt: Date | null;
    deletedByUserId: string | null;
    isEdited: boolean;
    replyTo: {
      id: string;
      senderId: string;
      content: string | null;
      createdAt: Date;
      deletedAt: Date | null;
      isEdited: boolean;
    } | null;
  } {
    const { media, replyToMessage, ...rest } = message;
    const isDeleted = !!message.deletedAt;
    const reply =
      replyToMessage &&
      ({
        id: replyToMessage.id,
        senderId: replyToMessage.senderId,
        content: replyToMessage.deletedAt ? null : replyToMessage.content,
        createdAt: replyToMessage.createdAt,
        deletedAt: replyToMessage.deletedAt ?? null,
        isEdited: replyToMessage.isEdited,
      } as const);
    return {
      ...rest,
      content: isDeleted ? null : rest.content,
      media: isDeleted ? null : media ? { id: media.id, type: media.type, url: media.url, mimeType: media.mimeType, originalName: media.originalName } : null,
      deletedAt: message.deletedAt ?? null,
      deletedByUserId: message.deletedByUserId ?? null,
      isEdited: message.isEdited ?? false,
      replyTo: reply ?? null,
    } as Omit<T, 'media' | 'replyToMessage'> & {
      content: string | null;
      media: { id: string; type: string; url: string; mimeType: string; originalName: string | null } | null;
      deletedAt: Date | null;
      deletedByUserId: string | null;
      isEdited: boolean;
      replyTo: {
        id: string;
        senderId: string;
        content: string | null;
        createdAt: Date;
        deletedAt: Date | null;
        isEdited: boolean;
      } | null;
    };
  }

  private async getGroupReactionsForMessages(
    messageIds: string[],
    userId: string,
  ): Promise<Record<string, { emoji: string; count: number; reactedByMe: boolean }[]>> {
    if (!messageIds.length) return {};
    const rows = await this.prisma.groupMessageReaction.findMany({
      where: { messageId: { in: messageIds } },
      select: { messageId: true, emoji: true, userId: true },
    });

    const map: Record<string, Map<string, { count: number; reactedByMe: boolean }>> = {};
    for (const row of rows) {
      if (!map[row.messageId]) {
        map[row.messageId] = new Map();
      }
      const key = row.emoji;
      const entry = map[row.messageId].get(key) ?? { count: 0, reactedByMe: false };
      entry.count += 1;
      if (row.userId === userId) {
        entry.reactedByMe = true;
      }
      map[row.messageId].set(key, entry);
    }

    const result: Record<string, { emoji: string; count: number; reactedByMe: boolean }[]> = {};
    for (const [messageId, emojiMap] of Object.entries(map)) {
      result[messageId] = Array.from(emojiMap.entries()).map(([emoji, v]) => ({
        emoji,
        count: v.count,
        reactedByMe: v.reactedByMe,
      }));
    }
    return result;
  }

  private async getChannelReactionsForMessages(
    messageIds: string[],
    userId: string,
  ): Promise<Record<string, { emoji: string; count: number; reactedByMe: boolean }[]>> {
    if (!messageIds.length) return {};
    const rows = await this.prisma.channelMessageReaction.findMany({
      where: { messageId: { in: messageIds } },
      select: { messageId: true, emoji: true, userId: true },
    });

    const map: Record<string, Map<string, { count: number; reactedByMe: boolean }>> = {};
    for (const row of rows) {
      if (!map[row.messageId]) {
        map[row.messageId] = new Map();
      }
      const key = row.emoji;
      const entry = map[row.messageId].get(key) ?? { count: 0, reactedByMe: false };
      entry.count += 1;
      if (row.userId === userId) {
        entry.reactedByMe = true;
      }
      map[row.messageId].set(key, entry);
    }

    const result: Record<string, { emoji: string; count: number; reactedByMe: boolean }[]> = {};
    for (const [messageId, emojiMap] of Object.entries(map)) {
      result[messageId] = Array.from(emojiMap.entries()).map(([emoji, v]) => ({
        emoji,
        count: v.count,
        reactedByMe: v.reactedByMe,
      }));
    }
    return result;
  }

  private async getGroupMessageWithReactionsForUser(messageId: string, userId: string) {
    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        media: true,
        replyToMessage: {
          select: {
            id: true,
            senderId: true,
            content: true,
            createdAt: true,
            deletedAt: true,
            isEdited: true,
          },
        },
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    const reactions = await this.getGroupReactionsForMessages([message.id], userId);
    return this.toMessageWithMedia({ ...message, reactions: reactions[message.id] ?? [] });
  }

  private async getChannelMessageWithReactionsForUser(messageId: string, userId: string) {
    const message = await this.prisma.channelMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        media: true,
        replyToMessage: {
          select: {
            id: true,
            senderId: true,
            content: true,
            createdAt: true,
            deletedAt: true,
            isEdited: true,
          },
        },
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    const reactions = await this.getChannelReactionsForMessages([message.id], userId);
    return this.toMessageWithMedia({ ...message, reactions: reactions[message.id] ?? [] });
  }
}
