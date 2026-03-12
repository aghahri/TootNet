import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { MediaService, MediaInfo } from './media.service';
import { RegisterMediaDto } from './dto/register-media.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

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
}
