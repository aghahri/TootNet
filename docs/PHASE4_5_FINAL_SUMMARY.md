# Phase 4 & 5 — Backend Evolution Summary

## Pre-step hardening (already in place)

- **Last-admin protection:** In `NetworksService`, `GroupsService`, and `ChannelsService`, `demoteMember` counts admins in scope and throws `ForbiddenException('Cannot demote the last network/group/channel admin')` when `adminCount <= 1`. Self-demotion that would remove the last admin is blocked.
- **Admin list ordering:** All admin list endpoints use explicit `orderBy: { createdAt: 'desc' }` in `AdminService`.
- **Role enums:** `NetworkMemberRole` (NETWORK_ADMIN, MEMBER), `GroupMemberRole` (GROUP_ADMIN, MEMBER), `ChannelMemberRole` (CHANNEL_ADMIN, SUBSCRIBER). Naming is consistent; no changes.

---

## Step 4.3 — Moderation foundations (already implemented)

- **POST /messages/report** — Body: messageType (GROUP | CHANNEL), messageId, reason, description?. Reporter must be able to see the message; stored in `MessageReport`.
- **POST /networks/:id/members/:memberUserId/suspend** | **unsuspend** — Network admin only; `suspendedAt` on NetworkMember; suspended users cannot post (enforced in MessagesService and gateway).
- **DELETE /groups/:id/messages/:messageId** | **DELETE /channels/:id/messages/:messageId** — Group or network admin / channel or network admin; uses `ensureCanModerateGroupMessage` and `ensureCanModerateChannelMessage`.

---

## Step 4.4 — Showcase (Vitrin) — updated

- **GET /showcase** — Returns: `announcements`, `news`, `notices`, `featuredNetworks`, `featuredGroups`, `featuredChannels`, `businesses`, `highlights`.
- **Design:** Lightweight selects; limits per section (e.g. 10 for featured); `announcements` sourced from published `Announcement` (GLOBAL); `notices` placeholder (empty array); featured items prefer `isFeatured` then `createdAt`; only PUBLIC networks in featured; Unicode-safe for Persian.

---

## Step 4.5 — Discovery (already implemented, updated for visibility)

- **GET /discover/networks** — Only PUBLIC networks; optional `?limit=`.
- **GET /discover/networks/:id** — Returns 404 for non-PUBLIC.
- **GET /discover/networks/:id/groups** | **/channels** — Only if network is PUBLIC.

---

## Step 5.1 — Visibility model

**Schema**

- Enum **NetworkVisibility:** `PUBLIC`, `PRIVATE`, `INVITE_ONLY`.
- **Network:** `visibility NetworkVisibility @default(PUBLIC)`, index on `visibility`.

**Behavior**

- **PUBLIC:** Shown in discover and in showcase featured networks.
- **PRIVATE:** Not returned by discover or showcase; members still use normal network/group/channel APIs when authenticated and member.
- **INVITE_ONLY:** Reserved for future invite flows; discover/showcase treat like PRIVATE (not listed).

**Files**

- `prisma/schema.prisma` — enum + Network.visibility.
- `src/networks/dto/create-network.dto.ts` — optional `visibility`.
- `src/networks/dto/update-network.dto.ts` — optional `visibility`, `isFeatured`.
- `src/networks/networks.service.ts` — create/update set visibility.
- `src/discover/discover.service.ts` — all methods filter by `visibility: 'PUBLIC'`.
- `src/showcase/showcase.service.ts` — `getFeaturedNetworks()` where `visibility: 'PUBLIC'`.

---

## Step 5.2 — Featured / curated content

**Schema**

- **Network:** `isFeatured Boolean @default(false)`, index.
- **Group:** `isFeatured Boolean @default(false)`, index.
- **Channel:** `isFeatured Boolean @default(false)`, index.

**Behavior**

- Showcase featured sections use `orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }]` — featured first, then latest.
- Network/group/channel admins can set `isFeatured` via existing PATCH/update endpoints (UpdateNetworkDto, UpdateGroupDto, UpdateChannelDto).

**Files**

- `prisma/schema.prisma` — isFeatured on Network, Group, Channel.
- `src/networks/dto/update-network.dto.ts` — `isFeatured`.
- `src/groups/dto/update-group.dto.ts` — `isFeatured`.
- `src/channels/dto/update-channel.dto.ts` — `isFeatured`.
- `src/networks/networks.service.ts` — update writes `isFeatured`.
- `src/groups/groups.service.ts` — update writes `isFeatured`.
- `src/channels/channels.service.ts` — update writes `isFeatured`.
- `src/showcase/showcase.service.ts` — featured sections order by isFeatured desc, createdAt desc; select includes `isFeatured`.

---

## Step 5.3 — Announcements foundation

**Schema**

- Enum **AnnouncementScopeType:** `GLOBAL`, `NETWORK`.
- **Announcement:** id, title, body, scopeType, networkId?, isPublished, publishedAt?, createdAt, updatedAt. Relation to Network. Indexes on scopeType, networkId, (isPublished, publishedAt).

**Behavior**

- Showcase `announcements` = published GLOBAL announcements, ordered by publishedAt desc, limited.
- **GET /showcase/announcements** — Returns all published announcements (any scope), optional `?limit=`; public.

**Files**

- `prisma/schema.prisma` — AnnouncementScopeType, Announcement, Network.announcements.
- `src/showcase/showcase.service.ts` — `getAnnouncements()` from DB (published, GLOBAL); `getAnnouncementsList()` for GET /showcase/announcements.
- `src/showcase/showcase.controller.ts` — GET showcase/announcements.

**Note:** No admin create/update announcement endpoints in this step; can be added later (e.g. AdminController or dedicated AnnouncementsController).

---

## Step 5.4 — Notification foundation

**Schema**

- **Notification:** id, userId, type (VarChar 50), title, body?, readAt?, createdAt. Relation to User. Indexes on userId, readAt, createdAt.

**Endpoints**

- **GET /notifications** — Authenticated; returns current user’s notifications (paginated: limit, offset); lightweight list.
- **POST /notifications/:id/read** — Authenticated; sets readAt for that notification; only owner can mark read.

**Files**

- `prisma/schema.prisma` — Notification, User.notifications.
- `src/notifications/notifications.service.ts` — findAll, markRead.
- `src/notifications/notifications.controller.ts` — GET /, POST :id/read.
- `src/notifications/notifications.module.ts` — NotificationsModule.
- `src/app.module.ts` — imports NotificationsModule.

**Assumption:** Notifications are created by other parts of the system (e.g. message alerts, admin announcements); this step only provides read and mark-read. Creation can be added in a later step.

---

## New endpoints (this phase)

| Method | Path | Description |
|--------|------|-------------|
| GET | /showcase | Full Vitrin payload (announcements, notices, featured*, businesses, highlights). |
| GET | /showcase/announcements | Published announcements list; optional ?limit=. |
| GET | /notifications | Current user notifications (paginated). |
| POST | /notifications/:id/read | Mark notification read. |

(Moderation and discover endpoints were already present; discover now respects visibility.)

---

## Schema changes (summary)

1. **Network:** visibility (NetworkVisibility, default PUBLIC), isFeatured (Boolean, default false); indexes.
2. **Group / Channel:** isFeatured (Boolean, default false); indexes.
3. **Announcement:** new model + AnnouncementScopeType; Network.announcements.
4. **Notification:** new model; User.notifications.

---

## How visibility affects discovery and showcase

- **Discover:** Only networks with `visibility: 'PUBLIC'` are listed or returned by id; groups/channels of a network are only returned if that network is PUBLIC.
- **Showcase:** Featured networks are only those with `visibility: 'PUBLIC'`. Other sections (groups, channels) are not filtered by network visibility in this MVP (they can be refined later).

---

## How featured content works

- **Showcase** featured sections (networks, groups, channels) use:
  - `orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }]`
  - Same limit as before (e.g. 10).
- Admins set `isFeatured` via existing PATCH endpoints (networks/:id, groups/:id, channels/:id) with body `{ isFeatured: true }`.

---

## How announcements are modeled

- **Announcement** has scope (GLOBAL or NETWORK), optional networkId, isPublished, publishedAt.
- **Showcase** uses only published GLOBAL announcements for the main `announcements` array.
- **GET /showcase/announcements** returns all published announcements (any scope) for a dedicated list page. Title/body are Unicode-safe for Persian.

---

## How notifications are modeled

- **Notification** is per-user: type (string), title, body (optional), readAt (optional), createdAt.
- Users only see and mark their own notifications. Type can later distinguish new-message, admin-announcement, moderation, system. Foundation only; no creation endpoints in this step.

---

## Migration commands

```bash
cd toot-backend
npx prisma generate
npx prisma migrate dev --name visibility_featured_announcements_notifications
```

---

## Files created or updated

**Created**

- `src/notifications/notifications.service.ts`
- `src/notifications/notifications.controller.ts`
- `src/notifications/notifications.module.ts`
- `docs/PHASE4_5_FINAL_SUMMARY.md`

**Updated**

- `prisma/schema.prisma` — NetworkVisibility, Network.visibility & isFeatured, Group/Channel.isFeatured, Announcement, Notification, relations/indexes.
- `src/networks/dto/create-network.dto.ts` — visibility.
- `src/networks/dto/update-network.dto.ts` — visibility, isFeatured.
- `src/networks/networks.service.ts` — create/update visibility & isFeatured.
- `src/groups/dto/update-group.dto.ts` — isFeatured.
- `src/groups/groups.service.ts` — update isFeatured.
- `src/channels/dto/update-channel.dto.ts` — isFeatured.
- `src/channels/channels.service.ts` — update isFeatured.
- `src/discover/discover.service.ts` — filter by visibility PUBLIC.
- `src/showcase/showcase.service.ts` — notices, getAnnouncements from DB, getAnnouncementsList, featured order by isFeatured + visibility for networks.
- `src/showcase/showcase.controller.ts` — GET showcase/announcements.
- `src/app.module.ts` — NotificationsModule.

---

## MVP assumptions

- **Visibility:** INVITE_ONLY is not yet used in join logic; only PUBLIC/PRIVATE drive discover and showcase.
- **Announcements:** No admin UI or endpoints to create/update/publish; schema and read endpoints are in place.
- **Notifications:** No creation endpoints; other features will create records (e.g. via a shared helper or event handler later).
- **Featured:** Toggled via existing PATCH on network/group/channel; no separate “curation” API.
- **Persian:** All text fields stored and returned as Unicode; no normalization in this phase; structure allows future Persian-aware search/ranking.
