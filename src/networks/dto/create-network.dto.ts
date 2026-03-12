import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum NetworkVisibilityDto {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  INVITE_ONLY = 'INVITE_ONLY',
}

export class CreateNetworkDto {
  @IsString()
  @MinLength(2, { message: 'Network name must be at least 2 characters' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  slug?: string;

  @IsOptional()
  @IsEnum(NetworkVisibilityDto)
  visibility?: NetworkVisibilityDto;
}
