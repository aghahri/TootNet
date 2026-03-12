import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminPaginationQueryDto, clampAdminLimit } from './dto/admin-pagination.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: AdminPaginationQueryDto) {
    const limit = clampAdminLimit(query.limit);
    const offset = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' }, // explicit ordering for admin lists
        skip: offset,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          globalRole: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: items,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + items.length < total,
      },
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mobile: true,
        name: true,
        avatar: true,
        bio: true,
        globalRole: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async listNetworks(query: AdminPaginationQueryDto) {
    const limit = clampAdminLimit(query.limit);
    const offset = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.network.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.network.count(),
    ]);

    return {
      data: items,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + items.length < total,
      },
    };
  }

  async listGroups(query: AdminPaginationQueryDto) {
    const limit = clampAdminLimit(query.limit);
    const offset = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.group.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          networkId: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.group.count(),
    ]);

    return {
      data: items,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + items.length < total,
      },
    };
  }

  async listChannels(query: AdminPaginationQueryDto) {
    const limit = clampAdminLimit(query.limit);
    const offset = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.channel.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          networkId: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.channel.count(),
    ]);

    return {
      data: items,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + items.length < total,
      },
    };
  }
}
