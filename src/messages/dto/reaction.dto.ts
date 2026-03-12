import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReactionDto {
  @IsString()
  @MinLength(1, { message: 'Emoji is required' })
  @MaxLength(64)
  emoji: string;
}

