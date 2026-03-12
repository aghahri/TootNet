# Phase 3 — Implementation Summary

## 1. Files Created / Updated

### Created

**Networks**
- `src/networks/dto/create-network.dto.ts`
- `src/networks/dto/update-network.dto.ts`
- `src/networks/networks.service.ts`
- `src/networks/networks.controller.ts`
- `src/networks/networks.module.ts`

**Groups**
- `src/groups/dto/create-group.dto.ts`
- `src/groups/dto/update-group.dto.ts`
- `src/groups/groups.service.ts`
- `src/groups/groups.controller.ts`
- `src/groups/groups.module.ts`

**Channels**
- `src/channels/dto/create-channel.dto.ts`
- `src/channels/dto/update-channel.dto.ts`
- `src/channels/channels.service.ts`
- `src/channels/channels.controller.ts`
- `src/channels/channels.module.ts`

**Permissions**
- `src/permissions/permissions.module.ts` (new; PermissionsService already existed)

**Messages**
- `src/messages/dto/create-message.dto.ts`
- `src/messages/dto/pagination-query.dto.ts`
- `src/messages/messages.service.ts`
- `src/messages/messages.module.ts`

**Gateway (Socket.IO)**
- `src/gateway/chat.gateway.ts`
- `src/gateway/gateway.module.ts`

### Updated

- `src/permissions/permissions.service.ts` — added `ensureNetworkAdmin(userId, networkId)`
- `src/app.module.ts` — registered `PermissionsModule`, `NetworksModule`, `GroupsModule`, `ChannelsModule`, `GatewayModule`
- `src/groups/groups.module.ts` — imports `MessagesModule`
- `src/groups/groups.controller.ts` — added `POST/GET :id/messages` (delegate to MessagesService)
- `src/channels/channels.module.ts` — imports `MessagesModule`
- `src/channels/channels.controller.ts` — added `POST/GET :id/messages` (delegate to MessagesService)
- `src/main.ts` — `app.useWebSocketAdapter(new IoAdapter(app))` for Socket.IO

---

## 2. Modules Implemented

| Module          | Purpose |
|-----------------|---------|
| **PermissionsModule** | Global module; exposes `PermissionsService` for membership and admin checks. |
| **NetworksModule**   | CRUD networks, join, list members. Creator becomes `NETWORK_ADMIN`. |
| **GroupsModule**     | CRUD groups (within a network), join, list members, message endpoints. |
| **ChannelsModule**   | CRUD channels (within a network), join, list members, message endpoints. |
| **MessagesModule**   | Group and channel message creation and paginated listing; used by Groups/Channels and gateway. |
| **GatewayModule**    | Socket.IO gateway: auth on connect, join/leave rooms, group_message and channel_message with server-side checks. |

---

## 3. Prisma Schema Changes

**None in this phase.** Schema already included:

- `User`, `RefreshToken`, `Network`, `NetworkMember`, `Group`, `GroupMember`, `GroupMessage`, `Channel`, `ChannelMember`, `ChannelMessage`
- Enums: `GlobalRole`, `NetworkMemberRole`, `GroupMemberRole`, `ChannelMemberRole`
- Unique constraints: `(userId, networkId)`, `(userId, groupId)`, `(userId, channelId)` on membership tables
- Indexes on `networkId`, `groupId`, `channelId`, and `(groupId|channelId, createdAt)` for messages

No new migrations required for Phase 3.

---

## 4. Permission Architecture

All rules are enforced in the **service layer** (and in the gateway for realtime), not only in controllers.

**PermissionsService** (single place for authz):

- `ensureNetworkMember(userId, networkId)` — user must be in the network; throws `ForbiddenException` otherwise.
- `ensureNetworkAdmin(userId, networkId)` — user must be `NETWORK_ADMIN` in that network.
- `ensureGroupMember(userId, groupId)` — user must be in the group.
- `ensureChannelMember(userId, channelId)` — user must be in the channel.
- `ensureChannelAdmin(userId, channelId)` — user must be `CHANNEL_ADMIN` in that channel.
- `canPostInGroup(userId, groupId)` — same as `ensureGroupMember` (all group members can post).

**Usage:**

- **Networks:** Join creates `NetworkMember`; duplicate join prevented. `PATCH /networks/:id` and `GET /networks/:id/members` use `ensureNetworkAdmin` and `ensureNetworkMember` respectively.
- **Groups:** Create requires `ensureNetworkAdmin`. Join requires `ensureNetworkMember` on the **network** first, then create `GroupMember`; duplicate join prevented. Message post/read use `canPostInGroup` / `ensureGroupMember`.
- **Channels:** Same as groups for create/join (network membership first). Channel messages: read uses `ensureChannelMember`, post uses `ensureChannelAdmin`.
- **Gateway:** On connect, JWT from `handshake.auth.token` (or `Authorization` header) is verified and `userId` stored in `socket.data`. `join_group` / `join_channel` call `ensureGroupMember` / `ensureChannelMember` before joining the room. `group_message` uses MessagesService (which uses `canPostInGroup`); `channel_message` uses `ensureChannelAdmin` then MessagesService. No trust of client-only room joins.

---

## 5. Endpoint List

| Method | Path | Description |
|--------|------|-------------|
| **Networks** | | |
| POST | `/networks` | Create network (caller becomes NETWORK_ADMIN). |
| GET | `/networks` | List networks (with `isMember` / `myRole` for current user). |
| GET | `/networks/:id` | Get one network. |
| PATCH | `/networks/:id` | Update network (network admin only). |
| POST | `/networks/:id/join` | Join network (no duplicate membership). |
| GET | `/networks/:id/members` | List members (network members only). |
| **Groups** | | |
| POST | `/groups` | Create group in network (body: `networkId`, name, description); network admin only. |
| GET | `/groups/:id` | Get group (network member required). |
| PATCH | `/groups/:id` | Update group (network or group admin). |
| POST | `/groups/:id/join` | Join group (must be network member first). |
| GET | `/groups/:id/members` | List members (group members only). |
| POST | `/groups/:id/messages` | Send message (group members only). |
| GET | `/groups/:id/messages` | List messages, paginated (group members only). Query: `limit`, `offset`. |
| **Channels** | | |
| POST | `/channels` | Create channel in network (body: `networkId`, name, description); network admin only. |
| GET | `/channels/:id` | Get channel (network member required). |
| PATCH | `/channels/:id` | Update channel (network or channel admin). |
| POST | `/channels/:id/join` | Join channel (must be network member first). |
| GET | `/channels/:id/members` | List members (channel members only). |
| POST | `/channels/:id/messages` | Post message (channel admins only). |
| GET | `/channels/:id/messages` | List messages, paginated (channel members only). Query: `limit`, `offset`. |

**Socket.IO (same HTTP server, default path)**

- Client sends JWT in `handshake.auth.token` or `Authorization: Bearer <token>`.
- Events (client → server): `join_group`, `leave_group`, `group_message`, `join_channel`, `leave_channel`, `channel_message`.
- Events (server → client): `group_message`, `channel_message` (payload = created message with sender).
- Rooms: `group:<groupId>`, `channel:<channelId>`. Join only after server-side membership check.

---

## 6. Migration Commands

No schema change in Phase 3. To ensure DB is up to date from previous phases:

```bash
cd toot-backend
npx prisma generate
npx prisma migrate dev   # if you have pending migrations
```

---

## 7. Persian / RTL Readiness (Backend)

- All relevant API and DB fields support Unicode (Persian text) in names, descriptions, bios, and message content.
- No schema or validation change was required for Persian; normalization (e.g. ی/ي, ک/ك) can be added later in search/indexing.
