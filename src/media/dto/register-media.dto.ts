import { IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { MediaType } from '@prisma/client';

/** Metadata-only registration. Binary upload handling comes later via storage provider. */
export class RegisterMediaDto {
  @IsEnum(MediaType)
  type: MediaType;

  /** URL where the file is or will be stored (e.g. from client-side upload). */
  @IsString()
  @IsUrl()
  @MaxLength(1024)
  url: string;

  @IsInt()
  @Min(0)
  size: number;

  @IsString()
  @MaxLength(128)
  mimeType: string;

  /** Original filename; supports Unicode/Persian. */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  originalName?: string;
}
