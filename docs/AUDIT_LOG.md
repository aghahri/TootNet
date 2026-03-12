# Audit Log System (Step 6.2)

## Overview

Centralized audit logging for important system actions. Audit entries are written from the service layer; controllers stay thin. The design is simple and extensible for MVP, with room for future admin/audit browsing APIs.

## Schema

**Model: `AuditLog`**

| Field         | Type     | Description                                      |
|---------------|----------|--------------------------------------------------|
| id            | String   | CUID primary key                                 |
| actorUserId   | String   | User who performed the action (no FK; survives user deletion) |
| action        | String   | Action constant (e.g. `NETWORK_MEMBER_PROMOTED`)  |
| resourceType  | String   | Resource type (e.g. `network_member`)            |
| resourceId    | String?  | ID of the affected resource (optional)           |
| metadata      | Json?    | Lightweight extensible payload                   |
| createdAt     | DateTime | When the action occurred                         |

Indexes: `actorUserId`, `action`, `(resourceType, resourceId)`, `createdAt`.

## AuditService

- **Location:** `src/audit/audit.service.ts`
- **Method:** `log(params: AuditLogParams): Promise<void>`
- **Behavior:** Fire-and-forget. Failures in writing an audit entry do not throw; the main business flow is never broken by audit write errors.

## Constants

- **Actions:** `src/audit/audit.constants.ts` — `AuditAction`, `AuditResourceType`
- Use constants for consistency and to make future query/reporting easier.

## Wired Events

| Action                     | Resource Type   | Where Written        | Typical metadata                          |
|----------------------------|-----------------|----------------------|-------------------------------------------|
| NETWORK_MEMBER_PROMOTED    | network_member  | NetworksService      | targetUserId, previousRole, newRole       |
| NETWORK_MEMBER_DEMOTED     | network_member  | NetworksService      | targetUserId, previousRole, newRole       |
| NETWORK_MEMBER_SUSPENDED   | network_member  | NetworksService      | targetUserId                              |
| NETWORK_MEMBER_UNSUSPENDED | network_member  | NetworksService      | targetUserId                              |
| GROUP_MEMBER_PROMOTED      | group_member    | GroupsService        | targetUserId, previousRole, newRole       |
| GROUP_MEMBER_DEMOTED       | group_member    | GroupsService        | targetUserId, previousRole, newRole       |
| CHANNEL_MEMBER_PROMOTED    | channel_member  | ChannelsService      | targetUserId, previousRole, newRole       |
| CHANNEL_MEMBER_DEMOTED     | channel_member  | ChannelsService      | targetUserId, previousRole, newRole       |
| GROUP_MESSAGE_DELETED      | group_message   | (legacy hard delete) | groupId, networkId                         |
| CHANNEL_MESSAGE_DELETED    | channel_message | (legacy hard delete) | channelId, networkId                      |
| GROUP_MESSAGE_EDITED       | group_message   | MessagesService      | groupId, networkId, previousContentLength   |
| CHANNEL_MESSAGE_EDITED     | channel_message | MessagesService      | channelId, networkId, previousContentLength |
| GROUP_MESSAGE_SOFT_DELETED | group_message   | MessagesService      | groupId, networkId                         |
| CHANNEL_MESSAGE_SOFT_DELETED | channel_message | MessagesService    | channelId, networkId                       |
| MESSAGE_REPORTED           | report          | ModerationService    | messageId, messageType, reason             |

## Design Decisions

1. **No FK to User:** `actorUserId` is stored as a string so audit rows remain valid even if the user is deleted.
2. **Single write entry point:** All audit writes go through `AuditService.log()`; no duplicated audit logic.
3. **Metadata is optional and extensible:** `AuditMetadata` interface documents common keys; additional keys can be added without schema change.
4. **Log only on actual changes:** Promotion/demotion/suspend/unsuspend log only when the state change is applied (idempotent no-ops do not write audit).
5. **Global AuditModule:** Any service can inject `AuditService` without importing the audit module in every feature module.

## MVP Assumptions

- No admin/audit browsing or filtering API in this step; foundation is ready for a future `GET /admin/audit-logs` (or similar).
- No retention or archival policy; can be added later.
- No async/queue for audit writes; fire-and-forget in the same request is acceptable for MVP.

## Migration

After schema change, run:

```bash
npx prisma migrate dev --name add_audit_log
```

Then:

```bash
npx prisma generate
```
