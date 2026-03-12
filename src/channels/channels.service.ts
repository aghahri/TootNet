import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResourceType } from '../audit/audit.constants';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateChannelDto) {
    await this.permissions.ensureNetworkAdmin(userId, dto.networkId);

    const network = await this.prisma.network.findUnique({
      where: { id: dto.networkId },
    });
    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const channel = await this.prisma.channel.create({
      data: {
        networkId: dto.networkId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        createdById: userId,
      },
    });

    await this.prisma.channelMember.create({
      data: {
        userId,
        channelId: channel.id,
        role: 'CHANNEL_ADMIN',
      },
    });

    return this.findOne(channel.id, userId);
  }

  async findOne(id: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        network: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        members: {
          where: { userId },
          select: { role: true, joinedAt: true },
        },
      },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    await this.permissions.ensureNetworkMember(userId, channel.networkId);

    const { members, ...rest } = channel;
    return {
      ...rest,
      isMember: members.length > 0,
      myRole: members[0]?.role ?? null,
    };
  }

  async update(id: string, userId: string, dto: UpdateChannelDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      select: { id: true, networkId: true },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const isNetworkAdmin = await this.prisma.networkMember
      .findUnique({
        where: {
          userId_networkId: { userId, networkId: channel.networkId },
        },
        select: { role: true },
      })
      .then((m: any) => m?.role === 'NETWORK_ADMIN');

    const isChannelAdmin = await this.prisma.channelMember
      .findUnique({
        where: { userId_channelId: { userId, channelId: id } },
        select: { role: true },
      })
      .then((m: any) => m?.role === 'CHANNEL_ADMIN');

    if (!isNetworkAdmin && !isChannelAdmin) {
      throw new ForbiddenException('Only network or channel admins can update this channel');
    }

    const data: { name?: string; description?: string | null; isFeatured?: boolean } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;

    if (Object.keys(data).length === 0) {
      return this.findOne(id, userId);
    }

    await this.prisma.channel.update({
      where: { id },
      data,
    });
    return this.findOne(id, userId);
  }

  async join(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, networkId: true },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    await this.permissions.ensureNetworkMember(userId, channel.networkId);

    const existing = await this.prisma.channelMember.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    if (existing) {
      throw new ConflictException('You are already a member of this channel');
    }

    await this.prisma.channelMember.create({
      data: {
        userId,
        channelId,
        role: 'SUBSCRIBER',
      },
    });

    return this.findOne(channelId, userId);
  }

  async getMembers(channelId: string, userId: string) {
    await this.permissions.ensureChannelMember(userId, channelId);

    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m: any) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  /** Role change: only channel admins; idempotent and scope-bound. Audit point: log here when audit is added. */
  async promoteMember(channelId: string, memberUserId: string, actorUserId: string) {
    await this.permissions.ensureChannelAdmin(actorUserId, channelId);

    const member = await this.prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: memberUserId, channelId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this channel');
    }
    if (member.role === 'CHANNEL_ADMIN') {
      return this.getMembers(channelId, actorUserId);
    }

    await this.prisma.channelMember.update({
      where: { userId_channelId: { userId: memberUserId, channelId } },
      data: { role: 'CHANNEL_ADMIN' },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CHANNEL_MEMBER_PROMOTED,
      resourceType: AuditResourceType.CHANNEL_MEMBER,
      resourceId: channelId,
      metadata: { targetUserId: memberUserId, previousRole: 'SUBSCRIBER', newRole: 'CHANNEL_ADMIN' },
    });
    return this.getMembers(channelId, actorUserId);
  }

  /** Demote to SUBSCRIBER (valid minimum). Idempotent if already SUBSCRIBER. Cannot remove last admin. */
  async demoteMember(channelId: string, memberUserId: string, actorUserId: string) {
    await this.permissions.ensureChannelAdmin(actorUserId, channelId);

    const member = await this.prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: memberUserId, channelId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this channel');
    }
    if (member.role === 'SUBSCRIBER') {
      return this.getMembers(channelId, actorUserId);
    }

    const adminCount = await this.prisma.channelMember.count({
      where: { channelId, role: 'CHANNEL_ADMIN' },
    });
    if (adminCount <= 1) {
      throw new ForbiddenException('Cannot demote the last channel admin');
    }

    await this.prisma.channelMember.update({
      where: { userId_channelId: { userId: memberUserId, channelId } },
      data: { role: 'SUBSCRIBER' },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.CHANNEL_MEMBER_DEMOTED,
      resourceType: AuditResourceType.CHANNEL_MEMBER,
      resourceId: channelId,
      metadata: { targetUserId: memberUserId, previousRole: 'CHANNEL_ADMIN', newRole: 'SUBSCRIBER' },
    });
    return this.getMembers(channelId, actorUserId);
  }
}
