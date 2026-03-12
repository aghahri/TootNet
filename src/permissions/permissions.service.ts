import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureNetworkMember(userId: string, networkId: string) {
    const member = await this.prisma.networkMember.findUnique({
      where: {
        userId_networkId: { userId, networkId },
      },
    });
    if (!member) {
      throw new ForbiddenException('You must join this network first');
    }
    return member;
  }

  async ensureGroupMember(userId: string, groupId: string) {
    const gm = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });
    if (!gm) {
      throw new ForbiddenException('You are not a member of this group');
    }
    return gm;
  }

  async ensureChannelMember(userId: string, channelId: string) {
    const cm = await this.prisma.channelMember.findUnique({
      where: {
        userId_channelId: { userId, channelId },
      },
    });
    if (!cm) {
      throw new ForbiddenException('You are not a member of this channel');
    }
    return cm;
  }

  async canPostInGroup(userId: string, groupId: string) {
    // Normal members may post; ensure membership.
    return this.ensureGroupMember(userId, groupId);
  }

  async ensureChannelAdmin(userId: string, channelId: string) {
    const cm = await this.prisma.channelMember.findUnique({
      where: {
        userId_channelId: { userId, channelId },
      },
      select: { role: true },
    });
    if (!cm || cm.role !== 'CHANNEL_ADMIN') {
      throw new ForbiddenException('Only channel admins may post here');
    }
    return cm;
  }

  async ensureNetworkAdmin(userId: string, networkId: string) {
    const nm = await this.prisma.networkMember.findUnique({
      where: {
        userId_networkId: { userId, networkId },
      },
      select: { role: true },
    });
    if (!nm || nm.role !== 'NETWORK_ADMIN') {
      throw new ForbiddenException('Only network admins can perform this action');
    }
    return nm;
  }

  async ensureGroupAdmin(userId: string, groupId: string) {
    const gm = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
      select: { role: true },
    });
    if (!gm || gm.role !== 'GROUP_ADMIN') {
      throw new ForbiddenException('Only group admins can perform this action');
    }
    return gm;
  }

  /** Throws if the user is suspended in this network (cannot post in groups/channels). */
  async ensureNotSuspendedInNetwork(userId: string, networkId: string) {
    const member = await this.prisma.networkMember.findUnique({
      where: { userId_networkId: { userId, networkId } },
      select: { suspendedAt: true },
    });
    if (!member) {
      throw new ForbiddenException('You must join this network first');
    }
    if (member.suspendedAt) {
      throw new ForbiddenException('You are suspended in this network');
    }
    return member;
  }

  /** Group admin or network admin can moderate group messages. */
  async ensureCanModerateGroupMessage(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { networkId: true },
    });
    if (!group) {
      throw new ForbiddenException('Group not found');
    }
    const [groupMember, networkMember] = await Promise.all([
      this.prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId } },
        select: { role: true },
      }),
      this.prisma.networkMember.findUnique({
        where: { userId_networkId: { userId, networkId: group.networkId } },
        select: { role: true },
      }),
    ]);
    const isGroupAdmin = groupMember?.role === 'GROUP_ADMIN';
    const isNetworkAdmin = networkMember?.role === 'NETWORK_ADMIN';
    if (!isGroupAdmin && !isNetworkAdmin) {
      throw new ForbiddenException('Only group or network admins can moderate this message');
    }
  }

  /** Channel admin or network admin can moderate channel messages. */
  async ensureCanModerateChannelMessage(userId: string, channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { networkId: true },
    });
    if (!channel) {
      throw new ForbiddenException('Channel not found');
    }
    const [channelMember, networkMember] = await Promise.all([
      this.prisma.channelMember.findUnique({
        where: { userId_channelId: { userId, channelId } },
        select: { role: true },
      }),
      this.prisma.networkMember.findUnique({
        where: { userId_networkId: { userId, networkId: channel.networkId } },
        select: { role: true },
      }),
    ]);
    const isChannelAdmin = channelMember?.role === 'CHANNEL_ADMIN';
    const isNetworkAdmin = networkMember?.role === 'NETWORK_ADMIN';
    if (!isChannelAdmin && !isNetworkAdmin) {
      throw new ForbiddenException('Only channel or network admins can moderate this message');
    }
  }

  /** Sender, or group admin, or network admin. Message must not be deleted. Caller must be member and not suspended. */
  async ensureCanEditGroupMessage(
    userId: string,
    groupId: string,
    message: { senderId: string; deletedAt: Date | null },
  ) {
    if (message.deletedAt) {
      throw new ForbiddenException('Cannot edit a deleted message');
    }
    await this.ensureGroupMember(userId, groupId);
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { networkId: true } });
    if (!group) throw new ForbiddenException('Group not found');
    await this.ensureNotSuspendedInNetwork(userId, group.networkId);
    const isSender = message.senderId === userId;
    if (isSender) return;
    await this.ensureCanModerateGroupMessage(userId, groupId);
  }

  /** Sender, or channel admin, or network admin. Message must not be deleted. Caller must be member and not suspended. */
  async ensureCanEditChannelMessage(
    userId: string,
    channelId: string,
    message: { senderId: string; deletedAt: Date | null },
  ) {
    if (message.deletedAt) {
      throw new ForbiddenException('Cannot edit a deleted message');
    }
    await this.ensureChannelMember(userId, channelId);
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { networkId: true } });
    if (!channel) throw new ForbiddenException('Channel not found');
    await this.ensureNotSuspendedInNetwork(userId, channel.networkId);
    const isSender = message.senderId === userId;
    if (isSender) return;
    await this.ensureCanModerateChannelMessage(userId, channelId);
  }

  /** Sender, or group admin, or network admin. Message must not be already soft-deleted. */
  async ensureCanDeleteGroupMessage(
    userId: string,
    groupId: string,
    message: { senderId: string; deletedAt: Date | null },
  ) {
    if (message.deletedAt) {
      throw new ForbiddenException('Message is already deleted');
    }
    const isSender = message.senderId === userId;
    if (isSender) return;
    await this.ensureCanModerateGroupMessage(userId, groupId);
  }

  /** Sender, or channel admin, or network admin. Message must not be already soft-deleted. */
  async ensureCanDeleteChannelMessage(
    userId: string,
    channelId: string,
    message: { senderId: string; deletedAt: Date | null },
  ) {
    if (message.deletedAt) {
      throw new ForbiddenException('Message is already deleted');
    }
    const isSender = message.senderId === userId;
    if (isSender) return;
    await this.ensureCanModerateChannelMessage(userId, channelId);
  }
}

