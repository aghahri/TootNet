import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  /** Text content. Required unless mediaId is provided. */
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  /** Optional attachment; must be media uploaded by the sender. */
  @IsOptional()
  @IsString()
  mediaId?: string;

  /** Optional reply target within the same group/channel. */
  @IsOptional()
  @IsString()
  replyToMessageId?: string;
}
