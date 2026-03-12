import { IsString, MaxLength, MinLength } from 'class-validator';

/** Edit message content only. MVP: mediaId is not changeable via edit. */
export class UpdateMessageDto {
  @IsString()
  @MinLength(1, { message: 'Content cannot be empty' })
  @MaxLength(10000)
  content: string;
}
