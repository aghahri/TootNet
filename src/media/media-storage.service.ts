import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

export type MediaCategory = 'images' | 'files' | 'voice' | 'video';

export interface UploadedMediaResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class MediaStorageService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('minio.endpoint');
    const port = this.config.get<number>('minio.port');
    const useSSL = this.config.get<boolean>('minio.useSSL');
    const accessKey = this.config.get<string>('minio.accessKey');
    const secretKey = this.config.get<string>('minio.secretKey');
    const bucket = this.config.get<string>('minio.bucket') ?? 'toot-media';

    if (!endpoint || !accessKey || !secretKey) {
      throw new Error('MinIO configuration is missing (MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY).');
    }

    this.client = new Client({
      endPoint: endpoint,
      port: port ?? 9000,
      useSSL: !!useSSL,
      accessKey,
      secretKey,
    });
    this.bucket = bucket;
  }

  private buildKey(category: MediaCategory, originalName: string): string {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    return `${category}/${timestamp}-${safeName}`;
  }

  private buildPublicUrl(key: string): string {
    const endpoint = this.config.get<string>('minio.endpoint');
    const port = this.config.get<number>('minio.port');
    const useSSL = this.config.get<boolean>('minio.useSSL');
    const protocol = useSSL ? 'https' : 'http';
    const host = port ? `${endpoint}:${port}` : endpoint;
    return `${protocol}://${host}/${this.bucket}/${key}`;
  }

  async uploadObject(
    category: MediaCategory,
    file: Express.Multer.File,
  ): Promise<UploadedMediaResult> {
    const key = this.buildKey(category, file.originalname || 'upload.bin');
    try {
      await this.client.putObject(this.bucket, key, file.buffer, {
        'Content-Type': file.mimetype,
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to upload media to storage');
    }
    const url = this.buildPublicUrl(key);
    return {
      url,
      key,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}

