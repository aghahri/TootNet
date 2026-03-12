import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, limit = DEFAULT_LIMIT, offset = 0) {
    const take = Math.min(limit, MAX_LIMIT);

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: {
        total,
        limit: take,
        offset,
        hasMore: offset + data.length < total,
      },
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.readAt) {
      return { id, readAt: notification.readAt };
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
      select: { id: true, readAt: true },
    });
    return updated;
  }
}
