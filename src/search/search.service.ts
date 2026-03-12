import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

const MAX_LIMIT = 50;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeQuery(q: string): string {
    // Hook for future Persian normalization (ی/ي, ک/ك, digits, etc.)
    return q.trim();
  }

  private clampLimit(limit?: number) {
    if (!limit) return 20;
    return Math.min(limit, MAX_LIMIT);
  }

  async searchNetworks(query: SearchQueryDto) {
    const q = this.normalizeQuery(query.q);
    if (!q) {
      return { data: [], meta: { total: 0, limit: this.clampLimit(query.limit), offset: query.offset ?? 0 } };
    }
    const limit = this.clampLimit(query.limit);
    const offset = query.offset ?? 0;

    const where = {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.network.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          createdAt: true,
        },
      }),
      this.prisma.network.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, limit, offset, hasMore: offset + items.length < total },
    };
  }

  async searchGroups(query: SearchQueryDto) {
    const q = this.normalizeQuery(query.q);
    if (!q) {
      return { data: [], meta: { total: 0, limit: this.clampLimit(query.limit), offset: query.offset ?? 0 } };
    }
    const limit = this.clampLimit(query.limit);
    const offset = query.offset ?? 0;

    const where = {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          networkId: true,
          createdAt: true,
        },
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, limit, offset, hasMore: offset + items.length < total },
    };
  }

  async searchChannels(query: SearchQueryDto) {
    const q = this.normalizeQuery(query.q);
    if (!q) {
      return { data: [], meta: { total: 0, limit: this.clampLimit(query.limit), offset: query.offset ?? 0 } };
    }
    const limit = this.clampLimit(query.limit);
    const offset = query.offset ?? 0;

    const where = {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          networkId: true,
          createdAt: true,
        },
      }),
      this.prisma.channel.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, limit, offset, hasMore: offset + items.length < total },
    };
  }

  async searchAll(query: SearchQueryDto) {
    const q = this.normalizeQuery(query.q);
    if (!q) {
      return { networks: [], groups: [], channels: [] };
    }
    const limit = this.clampLimit(query.limit);

    const [networks, groups, channels] = await Promise.all([
      this.prisma.network.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
        },
      }),
      this.prisma.group.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          networkId: true,
        },
      }),
      this.prisma.channel.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          networkId: true,
        },
      }),
    ]);

    return {
      networks,
      groups,
      channels,
    };
  }
}

