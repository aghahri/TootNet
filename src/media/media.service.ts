import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterMediaDto } from './dto/register-media.dto';

export interface MediaInfo {
  id: string;
  type: MediaType;
  url: string;
  size: number;
  mimeType: string;
  originalName: string | null;
  createdAt: Date;
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find media by id. Returns null if not found.
   * Caller can enforce authz (e.g. only uploader or members).
   */
  async findById(id: string): Promise<MediaInfo | null> {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });
    if (!media) return null;
    return this.toMediaInfo(media);
  }

  /**
   * Get media by id or throw. For use when media must exist (e.g. message attachment).
   */
  async getByIdOrThrow(id: string): Promise<MediaInfo> {
    const media = await this.findById(id);
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    return media;
  }

  /**
   * Ensure media exists and was uploaded by the given user (for attaching to messages).
   */
  async ensureOwnedByUser(mediaId: string, userId: string): Promise<MediaInfo> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    if (media.uploaderId !== userId) {
      throw new ForbiddenException('You can only attach media you uploaded');
    }
    return this.toMediaInfo(media);
  }

  /**
   * Register media metadata only. No binary upload in MVP.
   * URL can come from client-side upload (e.g. presigned URL flow added later).
   */
  async register(uploaderId: string, dto: RegisterMediaDto): Promise<MediaInfo> {
    const media = await this.prisma.media.create({
      data: {
        type: dto.type,
        url: dto.url.trim(),
        size: dto.size,
        mimeType: dto.mimeType.trim(),
        originalName: dto.originalName?.trim() ?? null,
        uploaderId,
      },
    });
    return this.toMediaInfo(media);
  }

  /** Lightweight payload for message responses. */
  toMediaInfo(media: { id: string; type: MediaType; url: string; size: number; mimeType: string; originalName: string | null; createdAt: Date }): MediaInfo {
    return {
      id: media.id,
      type: media.type,
      url: media.url,
      size: media.size,
      mimeType: media.mimeType,
      originalName: media.originalName,
      createdAt: media.createdAt,
    };
  }
}
