# Phase 4 — Step 4.3 (Moderation) & Step 4.4 (Showcase + Discovery) Summary

## Hardening (pre–Step 4.3)

### 1. Last-admin protection
- **Networks:** `demoteMember` counts `NETWORK_ADMIN` in the network; if `adminCount <= 1`, throws `ForbiddenException('Cannot demote the last network admin')`.
- **Groups:** Same for `GROUP_ADMIN` in the group.
- **Channels:** Same for `CHANNEL_ADMIN` in the channel.
- Self-demotion is therefore blocked when the user is the last admin (same count check).

### 2. Admin list ordering
- All admin list endpoints already use **explicit** `orderBy: { createdAt: 'desc' }` in `AdminService` (listUsers, listNetworks, listGroups, listChannels).
- Comment added in code to document that ordering is explicit.

### 3. Role enums
- **NetworkMemberRole:** `NETWORK_ADMIN`, `MEMBER`.
- **GroupMemberRole:** `GROUP_ADMIN`, `MEMBER`.
- **ChannelMemberRole:** `CHANNEL_ADMIN`, `SUBSCRIBER`.
- Naming is consistent (admin + regular role). No changes made.

---

## Step 4.3 — Moderation foundations

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/messages/report` | Report a group or channel message (body: messageType, messageId, reason, description?). |
| POST | `/networks/:id/members/:memberUserId/suspend` | Suspend member in network (network admin only). |
| POST | `/networks/:id/members/:memberUserId/unsuspend` | Unsuspend member (network admin only). |
| DELETE | `/groups/:groupId/messages/:messageId` | Delete group message (group admin or network admin). |
| DELETE | `/channels/:channelId/messages/:messageId` | Delete channel message (channel admin or network admin). |

### Moderation rules (enforced in services)

- **Report:** Caller must be able to see the message (`ensureGroupMember` for GROUP, `ensureChannelMember` for CHANNEL). Report is stored in `MessageReport` for future review.
- **Suspend / unsuspend:** Only **network admins** (`ensureNetworkAdmin`). Suspended members have `suspendedAt` set; unsuspend clears it.
- **Suspended users:** Cannot post in any group or channel of that network. `ensureNotSuspendedInNetwork(userId, networkId)` is used in `MessagesService.createGroupMessage` and `createChannelMessage` (and thus in the gateway when it calls the service).
- **Delete message:** Group message: `ensureCanModerateGroupMessage` (group admin **or** network admin). Channel message: `ensureCanModerateChannelMessage` (channel admin **or** network admin).

### PermissionsService additions

- `ensureNotSuspendedInNetwork(userId, networkId)` — throws if member is suspended (no post).
- `ensureCanModerateGroupMessage(userId, groupId)` — group admin or network admin.
- `ensureCanModerateChannelMessage(userId, channelId)` — channel admin or network admin.

### Files (moderation)

- **Created:** `src/moderation/dto/report-message.dto.ts`, `src/moderation/moderation.service.ts`, `src/moderation/moderation.controller.ts`, `src/moderation/moderation.module.ts`.
- **Updated:** `src/permissions/permissions.service.ts`, `src/messages/messages.service.ts`, `src/networks/networks.service.ts`, `src/networks/networks.controller.ts`, `src/groups/groups.controller.ts`, `src/channels/channels.controller.ts`, `src/app.module.ts`.

---

## Step 4.4 — Showcase (Vitrin) & Discovery

### Showcase

- **Endpoint:** `GET /showcase` (public, no auth).
- **Response shape:**
  ```json
  {
    "announcements": [],
    "news": [],
    "featuredNetworks": [...],
    "featuredGroups": [...],
    "featuredChannels": [...],
    "businesses": [],
    "highlights": []
  }
  ```
- **Data:** `featuredNetworks`, `featuredGroups`, `featuredChannels` are the latest 10 of each (by `createdAt` desc), lightweight `select`. `announcements`, `news`, `businesses`, `highlights` are empty arrays in MVP; methods are in place for later ranking/curation (e.g. neighborhood, promoted, SarPishey).
- **Files:** `src/showcase/showcase.service.ts`, `src/showcase/showcase.controller.ts`, `src/showcase/showcase.module.ts`.

### Discovery

- **Endpoints (all public):**
  - `GET /discover/networks?limit=` — list networks (default limit 30, max 50).
  - `GET /discover/networks/:id` — one network.
  - `GET /discover/networks/:id/groups?limit=` — groups in network.
  - `GET /discover/networks/:id/channels?limit=` — channels in network.
- **Data:** Lightweight selects; ordering by `createdAt` desc. No visibility filter in MVP; structure supports a future `visibility` (e.g. public/private/invite-only) on Network.
- **Files:** `src/discover/discover.service.ts`, `src/discover/discover.controller.ts`, `src/discover/discover.module.ts`.

---

## Prisma schema changes

1. **NetworkMember**
   - `suspendedAt DateTime? @map("suspended_at")` — when set, member is suspended in that network.
   - Index on `suspendedAt` for filtering.

2. **MessageReport** (new model)
   - `id`, `reporterId`, `messageType` (enum GROUP | CHANNEL), `groupMessageId?`, `channelMessageId?`, `reason`, `description?`, `createdAt`.
   - Relations: `reporter` (User), `groupMessage?`, `channelMessage?`.
   - Indexes: reporterId, groupMessageId, channelMessageId, createdAt.

3. **User:** `messageReports MessageReport[]`.
4. **GroupMessage:** `reports MessageReport[]`.
5. **ChannelMessage:** `reports MessageReport[]`.

---

## Migration commands

```bash
cd toot-backend
npx prisma generate
npx prisma migrate dev --name moderation_and_showcase
```

---

## File list (created/updated)

**Created**
- `src/moderation/dto/report-message.dto.ts`
- `src/moderation/moderation.service.ts`
- `src/moderation/moderation.controller.ts`
- `src/moderation/moderation.module.ts`
- `src/showcase/showcase.service.ts`
- `src/showcase/showcase.controller.ts`
- `src/showcase/showcase.module.ts`
- `src/discover/discover.service.ts`
- `src/discover/discover.controller.ts`
- `src/discover/discover.module.ts`
- `docs/PHASE4_STEP4.3_4.4_SUMMARY.md`

**Updated**
- `prisma/schema.prisma` (NetworkMember.suspendedAt, MessageReport, enums/relations)
- `src/permissions/permissions.service.ts` (ensureNotSuspendedInNetwork, ensureCanModerateGroupMessage, ensureCanModerateChannelMessage)
- `src/messages/messages.service.ts` (suspension check on create, deleteGroupMessage, deleteChannelMessage)
- `src/networks/networks.service.ts` (last-admin check, suspendMember, unsuspendMember)
- `src/networks/networks.controller.ts` (suspend/unsuspend routes)
- `src/groups/groups.service.ts` (last-admin check)
- `src/groups/groups.controller.ts` (Delete message route)
- `src/channels/channels.service.ts` (last-admin check)
- `src/channels/channels.controller.ts` (Delete message route)
- `src/admin/admin.service.ts` (comment on explicit ordering)
- `src/app.module.ts` (ModerationModule, ShowcaseModule, DiscoverModule)

---

## Persian / Unicode

- All text from DB is returned as-is (no stripping); responses are Unicode-safe for Persian.
- Showcase and discover use the same Prisma string fields; future Persian-aware search/ranking can be added in the same services.
