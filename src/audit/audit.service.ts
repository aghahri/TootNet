import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Lightweight metadata for audit entries. Extensible; safe if absent. */
export interface AuditMetadata {
  previousRole?: string;
  newRole?: string;
  targetUserId?: string;
  reason?: string;
  messageId?: string;
  networkId?: string;
  groupId?: string;
  channelId?: string;
  messageType?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AuditLogParams {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: AuditMetadata | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an audit log entry. Fire-and-forget: does not throw so that
   * audit failures do not break the main business flow.
   */
  async log(params: AuditLogParams): Promise<void> {
    const { actorUserId, action, resourceType, resourceId = null, metadata = null } = params;
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId,
          action,
          resourceType,
          resourceId,
          metadata: metadata ? (metadata as object) : undefined,
        },
      });
    } catch {
      // Do not propagate; audit must not fail the main operation.
    }
  }
}
