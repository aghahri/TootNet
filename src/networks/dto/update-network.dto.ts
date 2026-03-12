import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NetworkVisibilityDto } from './create-network.dto';
import { Transform } from 'class-transformer';

export class UpdateNetworkDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

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

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isFeatured?: boolean;
}
