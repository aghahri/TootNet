import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LIST_LIMIT = 30;

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List networks visible for discovery. Only PUBLIC visibility.
   * Lightweight, explicit ordering.
   */
  async getNetworks(limit = LIST_LIMIT) {
    return this.prisma.network.findMany({
      where: { visibility: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        visibility: true,
        createdAt: true,
      },
    });
  }

  async getNetworkById(id: string) {
    const network = await this.prisma.network.findFirst({
      where: { id, visibility: 'PUBLIC' },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!network) {
      throw new NotFoundException('Network not found');
    }
    return network;
  }

  async getNetworkGroups(networkId: string, limit = LIST_LIMIT) {
    const network = await this.prisma.network.findFirst({
      where: { id: networkId, visibility: 'PUBLIC' },
      select: { id: true },
    });
    if (!network) {
      throw new NotFoundException('Network not found');
    }

    return this.prisma.group.findMany({
      where: { networkId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      select: {
        id: true,
        name: true,
        description: true,
        networkId: true,
        createdAt: true,
      },
    });
  }

  async getNetworkChannels(networkId: string, limit = LIST_LIMIT) {
    const network = await this.prisma.network.findFirst({
      where: { id: networkId, visibility: 'PUBLIC' },
      select: { id: true },
    });
    if (!network) {
      throw new NotFoundException('Network not found');
    }

    return this.prisma.channel.findMany({
      where: { networkId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      select: {
        id: true,
        name: true,
        description: true,
        networkId: true,
        createdAt: true,
      },
    });
  }
}
