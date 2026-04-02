import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

export type FeedPost = {
  id: string;
  userId: string;
  text: string;
  mediaUrl: string | null;
  createdAt: Date;
  user: { id: string; name: string; avatar: string | null };
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePostDto): Promise<FeedPost> {
    const text = dto.text?.trim() ?? '';
    const mediaUrl = dto.mediaUrl?.trim() || null;

    if (!text && !mediaUrl) {
      throw new BadRequestException('Post must have text or an image');
    }

    const post = await this.prisma.post.create({
      data: {
        userId,
        text,
        mediaUrl,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return post;
  }

  async getFeed(userId: string): Promise<FeedPost[]> {
    // MVP: "global" feed = latest posts across all users.
    // Future: scope to networks/channels, block lists, etc.
    await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    return this.prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  }
}

