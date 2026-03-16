import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { MediaService, MediaInfo } from './media.service';
import { MediaStorageService, UploadedMediaResult } from './media-storage.service';
import { RegisterMediaDto } from './dto/register-media.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MediaType } from '@prisma/client';

@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly storage: MediaStorageService,
  ) {}

  /**
   * Get media metadata by id. Authenticated users only.
   * Future: scope access by network/channel or ownership.
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser('sub') _userId: string,
  ): Promise<MediaInfo> {
    return this.media.getByIdOrThrow(id);
  }

  /**
   * Register media metadata only. No binary upload in backend yet.
   * Use when client uploads elsewhere (e.g. presigned URL) and then registers the result.
   * Upload provider integration (S3/R2/MinIO) comes later.
   */
  @Post('register')
  async register(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterMediaDto,
  ): Promise<MediaInfo> {
    return this.media.register(userId, dto);
  }

  /**
   * Upload a media file to MinIO and store metadata in the Media table.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('sub') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadedMediaResult & { media: MediaInfo }> {
    const mime = file.mimetype || '';

    // Basic MIME type enforcement
    const allowed =
      mime.startsWith('image/') ||
      mime.startsWith('video/') ||
      mime.startsWith('audio/') ||
      mime === 'application/pdf' ||
      mime === 'application/zip' ||
      mime === 'application/x-zip-compressed';
    if (!allowed) {
      throw new Error('Unsupported file type');
    }

    let category: 'images' | 'files' | 'voice' | 'video' = 'files';
    let mediaType: MediaType = MediaType.FILE;
    if (mime.startsWith('image/')) {
      category = 'images';
      mediaType = MediaType.IMAGE;
    } else if (mime.startsWith('video/')) {
      category = 'video';
      mediaType = MediaType.VIDEO;
    } else if (mime.startsWith('audio/')) {
      category = 'voice';
      mediaType = MediaType.FILE;
    }

    const uploaded = await this.storage.uploadObject(category, file);

    const media = await this.media.register(userId, {
      type: mediaType,
      url: uploaded.url,
      size: uploaded.size,
      mimeType: uploaded.mimeType,
      originalName: file.originalname,
    });

    return {
      ...uploaded,
      media,
    };
  }
}
