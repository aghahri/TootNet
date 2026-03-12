import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupMemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResourceType } from '../audit/audit.constants';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateGroupDto) {
    await this.permissions.ensureNetworkAdmin(userId, dto.networkId);

    const network = await this.prisma.network.findUnique({
      where: { id: dto.networkId },
    });
    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const group = await this.prisma.group.create({
      data: {
        networkId: dto.networkId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        createdById: userId,
      },
    });

    await this.prisma.groupMember.create({
      data: {
        userId,
        groupId: group.id,
        role: GroupMemberRole.GROUP_ADMIN,
      },
    });

    return this.findOne(group.id, userId);
  }

  async findOne(id: string, userId: string) {
    const group = await this.prisma.group.findUnique({
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
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.permissions.ensureNetworkMember(userId, group.networkId);

    const { members, ...rest } = group;
    return {
      ...rest,
      isMember: members.length > 0,
      myRole: members[0]?.role ?? null,
    };
  }

  async update(id: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: { id: true, networkId: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isNetworkAdmin = await this.prisma.networkMember
      .findUnique({
        where: {
          userId_networkId: { userId, networkId: group.networkId },
        },
        select: { role: true },
      })
      .then((m) => m?.role === 'NETWORK_ADMIN');

    const isGroupAdmin = await this.prisma.groupMember
      .findUnique({
        where: { userId_groupId: { userId, groupId: id } },
        select: { role: true },
      })
      .then((m) => m?.role === 'GROUP_ADMIN');

    if (!isNetworkAdmin && !isGroupAdmin) {
      throw new ForbiddenException('Only network or group admins can update this group');
    }

    const data: { name?: string; description?: string | null; isFeatured?: boolean } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;

    if (Object.keys(data).length === 0) {
      return this.findOne(id, userId);
    }

    await this.prisma.group.update({
      where: { id },
      data,
    });
    return this.findOne(id, userId);
  }

  async join(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, networkId: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.permissions.ensureNetworkMember(userId, group.networkId);

    const existing = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (existing) {
      throw new ConflictException('You are already a member of this group');
    }

    await this.prisma.groupMember.create({
      data: {
        userId,
        groupId,
        role: GroupMemberRole.MEMBER,
      },
    });

    return this.findOne(groupId, userId);
  }

  async getMembers(groupId: string, userId: string) {
    await this.permissions.ensureGroupMember(userId, groupId);

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  /** Role change: only group admins; idempotent and scope-bound. Audit point: log here when audit is added. */
  async promoteMember(groupId: string, memberUserId: string, actorUserId: string) {
    await this.permissions.ensureGroupAdmin(actorUserId, groupId);

    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: memberUserId, groupId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this group');
    }
    if (member.role === GroupMemberRole.GROUP_ADMIN) {
      return this.getMembers(groupId, actorUserId);
    }

    await this.prisma.groupMember.update({
      where: { userId_groupId: { userId: memberUserId, groupId } },
      data: { role: GroupMemberRole.GROUP_ADMIN },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.GROUP_MEMBER_PROMOTED,
      resourceType: AuditResourceType.GROUP_MEMBER,
      resourceId: groupId,
      metadata: { targetUserId: memberUserId, previousRole: GroupMemberRole.MEMBER, newRole: GroupMemberRole.GROUP_ADMIN },
    });
    return this.getMembers(groupId, actorUserId);
  }

  /** Demote to MEMBER (valid minimum). Idempotent if already MEMBER. Cannot remove last admin. */
  async demoteMember(groupId: string, memberUserId: string, actorUserId: string) {
    await this.permissions.ensureGroupAdmin(actorUserId, groupId);

    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: memberUserId, groupId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this group');
    }
    if (member.role === GroupMemberRole.MEMBER) {
      return this.getMembers(groupId, actorUserId);
    }

    const adminCount = await this.prisma.groupMember.count({
      where: { groupId, role: GroupMemberRole.GROUP_ADMIN },
    });
    if (adminCount <= 1) {
      throw new ForbiddenException('Cannot demote the last group admin');
    }

    await this.prisma.groupMember.update({
      where: { userId_groupId: { userId: memberUserId, groupId } },
      data: { role: GroupMemberRole.MEMBER },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.GROUP_MEMBER_DEMOTED,
      resourceType: AuditResourceType.GROUP_MEMBER,
      resourceId: groupId,
      metadata: { targetUserId: memberUserId, previousRole: GroupMemberRole.GROUP_ADMIN, newRole: GroupMemberRole.MEMBER },
    });
    return this.getMembers(groupId, actorUserId);
  }
}
