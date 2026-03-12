# Admin & role management

## Admin list endpoints (Super Admin only)

All require `GlobalRole.SUPER_ADMIN`. Pagination: `?limit=20&offset=0` (limit clamped to 1–100).

| Method | Path | Response |
|--------|------|----------|
| GET | `/admin/users` | `{ data: UserListItem[], meta: { total, limit, offset, hasMore } }` |
| GET | `/admin/users/:id` | Single user (lightweight; no passwordHash) |
| GET | `/admin/networks` | `{ data: NetworkListItem[], meta }` |
| GET | `/admin/groups` | `{ data: GroupListItem[], meta }` |
| GET | `/admin/channels` | `{ data: ChannelListItem[], meta }` |

Responses use explicit `select` (no heavy nested Prisma objects). All text fields are returned as-is (Unicode-safe for Persian).

## Promote / demote (scope-bound)

Only the relevant admin can change roles in their scope:

- **Network** — only a **network admin** can promote/demote network members.
- **Group** — only a **group admin** can promote/demote group members.
- **Channel** — only a **channel admin** can promote/demote channel members.

Super admin has no special override for these; they must be a network/group/channel admin in that resource to use the endpoint.

| Method | Path | Scope |
|--------|------|--------|
| POST | `/networks/:id/members/:memberUserId/promote` | Network admin |
| POST | `/networks/:id/members/:memberUserId/demote` | Network admin |
| POST | `/groups/:id/members/:memberUserId/promote` | Group admin |
| POST | `/groups/:id/members/:memberUserId/demote` | Group admin |
| POST | `/channels/:id/members/:memberUserId/promote` | Channel admin |
| POST | `/channels/:id/members/:memberUserId/demote` | Channel admin |

- **Promote**: MEMBER → NETWORK_ADMIN, MEMBER → GROUP_ADMIN, SUBSCRIBER → CHANNEL_ADMIN. Idempotent if already at target role (returns current member list).
- **Demote**: to valid minimum only (MEMBER for network/group, SUBSCRIBER for channel). Idempotent if already at minimum.
- Target must exist in that network/group/channel; otherwise 404.

## Audit readiness

- Role changes are done in a single place per domain:
  - `NetworksService.promoteMember` / `demoteMember`
  - `GroupsService.promoteMember` / `demoteMember`
  - `ChannelsService.promoteMember` / `demoteMember`
- Each method has a comment: `Audit point: log here when audit is added`.
- To add audit logs later: insert a call to an `AuditService.recordRoleChange(...)` (or similar) at the start of the `update` block, with actorUserId, resource type/id, memberUserId, previous role, new role, and timestamp.
