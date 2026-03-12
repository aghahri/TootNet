# Message Edit and Soft Delete (Step 6.4)

## Overview

Message editing and soft deletion for group and channel messages. Edit history is append-only; soft delete hides content/media while keeping the row for moderation and threading.

## Schema Changes

**GroupMessage / ChannelMessage** — added:

- `isEdited` Boolean @default(false)
- `deletedAt` DateTime?
- `deletedByUserId` String? (no FK; audit-style consistency)

**Edit history (append-only):**

- **GroupMessageEdit:** id, messageId, previousContent, editedAt, editedByUserId
- **ChannelMessageEdit:** id, messageId, previousContent, editedAt, editedByUserId

## Edit Rules

1. **Who can edit:** Sender, or group admin / network admin (group messages); sender, or channel admin / network admin (channel messages).
2. **Suspended users** cannot edit (enforced via `ensureNotSuspendedInNetwork`).
3. **Deleted messages** cannot be edited (`deletedAt` set).
4. **Content:** Empty or whitespace-only is rejected.
5. **Media (MVP):** Edit does **not** change `mediaId`; only `content` is updated. Attachments are fixed at creation.

## Delete Rules

1. **Who can soft-delete:** Sender, or group/channel/network admin in scope.
2. **Already deleted** messages cannot be deleted again.
3. **Behavior:** Set `deletedAt` and `deletedByUserId`; row is kept.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| PATCH | /messages/group/:messageId | Edit group message (body: `{ content }`) |
| PATCH | /messages/channel/:messageId | Edit channel message (body: `{ content }`) |
| DELETE | /messages/group/:messageId | Soft-delete group message |
| DELETE | /messages/channel/:messageId | Soft-delete channel message |

Existing scoped deletes remain and now perform soft delete:

- DELETE /groups/:id/messages/:messageId
- DELETE /channels/:id/messages/:messageId

## Response Shape for Deleted Messages

When a message is soft-deleted (`deletedAt` set), list and get responses return:

- **content:** `null` (hidden)
- **media:** `null` (hidden)
- **deletedAt:** ISO date string
- **deletedByUserId:** user id who deleted
- **isEdited:** unchanged

Sender and other fields (id, createdAt, etc.) remain so the frontend can show a placeholder (e.g. “Message deleted”) and preserve RTL/ordering.

## Permissions

- `ensureCanEditGroupMessage(userId, groupId, message)` — member, not suspended, message not deleted; sender or group/network admin.
- `ensureCanEditChannelMessage(userId, channelId, message)` — same for channel.
- `ensureCanDeleteGroupMessage(userId, groupId, message)` — message not deleted; sender or group/network admin.
- `ensureCanDeleteChannelMessage(userId, channelId, message)` — same for channel.

## Audit Events

- **GROUP_MESSAGE_EDITED** / **CHANNEL_MESSAGE_EDITED** — metadata: groupId/channelId, networkId, previousContentLength.
- **GROUP_MESSAGE_SOFT_DELETED** / **CHANNEL_MESSAGE_SOFT_DELETED** — metadata: groupId/channelId, networkId.

## Realtime

The service returns the updated message from edit and the `{ deleted: true, id }` from soft-delete. The gateway can later emit `message_updated` and `message_deleted` by calling the same service methods and broadcasting to the room.

## Persian / Unicode

- Edited content is stored and returned as Unicode; no normalization in MVP.
- Response shapes are unchanged for RTL; `content: null` when deleted.

## Migration

```bash
npx prisma migrate dev --name message_edit_soft_delete
npx prisma generate
```

## MVP Assumptions

- Edit changes only `content`; `mediaId` is not editable.
- No hard delete in normal flow; soft delete is the default.
- Edit history is append-only; no history pruning in MVP.
- `deletedByUserId` is stored as string (no FK) for consistency with audit style.
