import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum MessageReportTypeDto {
  GROUP = 'GROUP',
  CHANNEL = 'CHANNEL',
}

export class ReportMessageDto {
  @IsEnum(MessageReportTypeDto)
  messageType: MessageReportTypeDto;

  @IsString()
  @MinLength(1)
  messageId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
