import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResourceType } from '../audit/audit.constants';
import { ReportMessageDto } from './dto/report-message.dto';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async reportMessage(reporterId: string, dto: ReportMessageDto) {
    if (dto.messageType === 'GROUP') {
      const message = await this.prisma.groupMessage.findUnique({
        where: { id: dto.messageId },
        select: { id: true, groupId: true },
      });
      if (!message) {
        throw new NotFoundException('Message not found');
      }
      await this.permissions.ensureGroupMember(reporterId, message.groupId);

      const report = await this.prisma.messageReport.create({
        data: {
          reporterId,
          messageType: 'GROUP',
          groupMessageId: message.id,
          channelMessageId: null,
          reason: dto.reason.trim(),
          description: dto.description?.trim() ?? null,
        },
      });
      await this.audit.log({
        actorUserId: reporterId,
        action: AuditAction.MESSAGE_REPORTED,
        resourceType: AuditResourceType.REPORT,
        resourceId: report.id,
        metadata: { messageId: dto.messageId, messageType: 'GROUP', reason: dto.reason.trim() },
      });
    } else {
      const message = await this.prisma.channelMessage.findUnique({
        where: { id: dto.messageId },
        select: { id: true, channelId: true },
      });
      if (!message) {
        throw new NotFoundException('Message not found');
      }
      await this.permissions.ensureChannelMember(reporterId, message.channelId);

      const report = await this.prisma.messageReport.create({
        data: {
          reporterId,
          messageType: 'CHANNEL',
          groupMessageId: null,
          channelMessageId: message.id,
          reason: dto.reason.trim(),
          description: dto.description?.trim() ?? null,
        },
      });
      await this.audit.log({
        actorUserId: reporterId,
        action: AuditAction.MESSAGE_REPORTED,
        resourceType: AuditResourceType.REPORT,
        resourceId: report.id,
        metadata: { messageId: dto.messageId, messageType: 'CHANNEL', reason: dto.reason.trim() },
      });
    }

    return { reported: true, messageId: dto.messageId };
  }
}
