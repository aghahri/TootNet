import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class AdminPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = DEFAULT_LIMIT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export function clampAdminLimit(limit?: number): number {
  if (limit == null || limit < 1) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}
