import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NetworkMemberRole, NetworkVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResourceType } from '../audit/audit.constants';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';

@Injectable()
export class NetworksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateNetworkDto) {
    const slug = dto.slug?.trim() || null;
    if (slug) {
      const existing = await this.prisma.network.findUnique({ where: { slug } });
      if (existing) {
        throw new ConflictException('A network with this slug already exists');
      }
    }

    const network = await this.prisma.network.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        slug: slug ?? null,
        visibility: dto.visibility ?? NetworkVisibility.PUBLIC,
        createdById: userId,
      },
    });

    await this.prisma.networkMember.create({
      data: {
        userId,
        networkId: network.id,
        role: NetworkMemberRole.NETWORK_ADMIN,
      },
    });

    return this.findOne(network.id, userId);
  }

  async findAll(userId: string) {
    const networks = await this.prisma.network.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        members: {
          where: { userId },
          select: { role: true, joinedAt: true },
        },
      },
    });

    return networks.map(({ members, ...n }) => ({
      ...n,
      isMember: members.length > 0,
      myRole: members[0]?.role ?? null,
    }));
  }

  async findOne(id: string, userId: string) {
    const network = await this.prisma.network.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        members: {
          where: { userId },
          select: { role: true, joinedAt: true },
        },
      },
    });
    if (!network) {
      throw new NotFoundException('Network not found');
    }
    const { members, ...rest } = network;
    return {
      ...rest,
      isMember: members.length > 0,
      myRole: members[0]?.role ?? null,
    };
  }

  async update(id: string, userId: string, dto: UpdateNetworkDto) {
    await this.permissions.ensureNetworkAdmin(userId, id);

    const slug = dto.slug !== undefined ? dto.slug?.trim() ?? null : undefined;
    if (slug !== undefined && slug) {
      const existing = await this.prisma.network.findFirst({
        where: { slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('A network with this slug already exists');
      }
    }

    const data: { name?: string; description?: string; slug?: string | null; visibility?: NetworkVisibility; isFeatured?: boolean } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.slug !== undefined) data.slug = slug ?? null;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;

    if (Object.keys(data).length === 0) {
      return this.findOne(id, userId);
    }

    await this.prisma.network.update({
      where: { id },
      data,
    });
    return this.findOne(id, userId);
  }

  async join(networkId: string, userId: string) {
    const network = await this.prisma.network.findUnique({ where: { id: networkId } });
    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const existing = await this.prisma.networkMember.findUnique({
      where: { userId_networkId: { userId, networkId } },
    });
    if (existing) {
      throw new ConflictException('You are already a member of this network');
    }

    await this.prisma.networkMember.create({
      data: {
        userId,
        networkId,
        role: NetworkMemberRole.MEMBER,
      },
    });

    return this.findOne(networkId, userId);
  }

  async getMembers(networkId: string, userId: string) {
    await this.permissions.ensureNetworkMember(userId, networkId);

    const members = await this.prisma.networkMember.findMany({
      where: { networkId },
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

  /** Role change: only network admins; idempotent and scope-bound. Audit point: log here when audit is added. */
  async promoteMember(networkId: string, memberUserId: string, actorUserId: string) {
    await this.permissions.ensureNetworkAdmin(actorUserId, networkId);

    const member = await this.prisma.networkMember.findUnique({
      where: { userId_networkId: { userId: memberUserId, networkId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this network');
    }
    if (member.role === NetworkMemberRole.NETWORK_ADMIN) {
      return this.getMembers(networkId, actorUserId);
    }

    await this.prisma.networkMember.update({
      where: { userId_networkId: { userId: memberUserId, networkId } },
      data: { role: NetworkMemberRole.NETWORK_ADMIN },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.NETWORK_MEMBER_PROMOTED,
      resourceType: AuditResourceType.NETWORK_MEMBER,
      resourceId: networkId,
      metadata: { targetUserId: memberUserId, previousRole: NetworkMemberRole.MEMBER, newRole: NetworkMemberRole.NETWORK_ADMIN },
    });
    return this.getMembers(networkId, actorUserId);
  }

  /** Demote to MEMBER (valid minimum). Idempotent if already MEMBER. Cannot remove last admin. */
  async demoteMember(networkId: string, memberUserId: string, actorUserId: string) {
    await this.permissions.ensureNetworkAdmin(actorUserId, networkId);

    const member = await this.prisma.networkMember.findUnique({
      where: { userId_networkId: { userId: memberUserId, networkId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this network');
    }
    if (member.role === NetworkMemberRole.MEMBER) {
      return this.getMembers(networkId, actorUserId);
    }

    const adminCount = await this.prisma.networkMember.count({
      where: { networkId, role: NetworkMemberRole.NETWORK_ADMIN },
    });
    if (adminCount <= 1) {
      throw new ForbiddenException('Cannot demote the last network admin');
    }

    await this.prisma.networkMember.update({
      where: { userId_networkId: { userId: memberUserId, networkId } },
      data: { role: NetworkMemberRole.MEMBER },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.NETWORK_MEMBER_DEMOTED,
      resourceType: AuditResourceType.NETWORK_MEMBER,
      resourceId: networkId,
      metadata: { targetUserId: memberUserId, previousRole: NetworkMemberRole.NETWORK_ADMIN, newRole: NetworkMemberRole.MEMBER },
    });
    return this.getMembers(networkId, actorUserId);
  }

  /** Only network admins. Suspended users cannot post in network groups/channels. */
  async suspendMember(networkId: string, memberUserId: string, actorUserId: string) {
    await this.permissions.ensureNetworkAdmin(actorUserId, networkId);

    const member = await this.prisma.networkMember.findUnique({
      where: { userId_networkId: { userId: memberUserId, networkId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this network');
    }

    if (member.suspendedAt) {
      return this.getMembers(networkId, actorUserId);
    }

    await this.prisma.networkMember.update({
      where: { userId_networkId: { userId: memberUserId, networkId } },
      data: { suspendedAt: new Date() },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.NETWORK_MEMBER_SUSPENDED,
      resourceType: AuditResourceType.NETWORK_MEMBER,
      resourceId: networkId,
      metadata: { targetUserId: memberUserId },
    });
    return this.getMembers(networkId, actorUserId);
  }

  async unsuspendMember(networkId: string, memberUserId: string, actorUserId: string) {
    await this.permissions.ensureNetworkAdmin(actorUserId, networkId);

    const member = await this.prisma.networkMember.findUnique({
      where: { userId_networkId: { userId: memberUserId, networkId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this network');
    }

    await this.prisma.networkMember.update({
      where: { userId_networkId: { userId: memberUserId, networkId } },
      data: { suspendedAt: null },
    });
    await this.audit.log({
      actorUserId,
      action: AuditAction.NETWORK_MEMBER_UNSUSPENDED,
      resourceType: AuditResourceType.NETWORK_MEMBER,
      resourceId: networkId,
      metadata: { targetUserId: memberUserId },
    });
    return this.getMembers(networkId, actorUserId);
  }
}
