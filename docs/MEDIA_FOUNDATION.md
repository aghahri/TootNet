# Media / File Foundation (Step 6.3)

## Overview

Media foundation for message attachments. Schema, service, and message integration are in place; binary upload pipeline is deferred. Storage is abstracted so S3, Cloudflare R2, or MinIO can be plugged in later.

## Schema

**Model: `Media`**

| Field        | Type     | Description                    |
|-------------|----------|--------------------------------|
| id          | String   | CUID                           |
| type        | MediaType| IMAGE \| VIDEO \| FILE         |
| url         | String   | URL or future storage key      |
| size        | Int      | Size in bytes                  |
| mimeType    | String   | MIME type                      |
| originalName| String?  | Filename (Unicode/Persian-safe)|
| uploaderId  | String   | User who registered the media  |
| createdAt   | DateTime |                                |

**Message integration**

- `GroupMessage.mediaId` (optional) → `Media`
- `ChannelMessage.mediaId` (optional) → `Media`
- On media delete: `onDelete: SetNull` so messages keep content and show broken attachment if needed.

## Storage abstraction

- **Interface:** `src/media/interfaces/storage-provider.interface.ts`
- **Methods (all optional for MVP):** `getUploadUrl`, `save`, `getUrl`, `delete`
- **MVP:** No implementation required; `POST /media/register` accepts `url` in the body (e.g. from client-side upload). A future provider will generate presigned URLs or persist binaries and set `url` accordingly.

## Endpoints

| Method | Path             | Auth | Description                    |
|--------|------------------|------|--------------------------------|
| GET    | /media/:id       | JWT  | Get media metadata by id      |
| POST   | /media/register  | JWT  | Register media (metadata only)|

**POST /media/register** body: `{ type, url, size, mimeType, originalName? }`. No binary upload; upload provider integration comes later.

## Message integration

- **Create (REST and Socket.IO):** Request body / payload may include optional `mediaId`. If present, backend validates that the media exists and `media.uploaderId === current user` (only your own media can be attached).
- **Validation:** Message must have at least one of non-empty `content` or `mediaId`.
- **Responses:** Group/channel message payloads include `media: { id, type, url, mimeType, originalName } | null` when `mediaId` is set.

## Authorization

- Only authenticated users can call `GET /media/:id` and `POST /media/register`.
- Media records store `uploaderId`; attaching to a message is allowed only for media you uploaded.

## Extensibility

- **Upload completion / callbacks:** MediaService can be extended with `confirmUpload(id, url)` or similar once a storage provider is added.
- **Delete / moderation:** Storage interface has `delete(key)`; future admin or cleanup jobs can remove files and then Prisma `Media` rows (or soft-delete).
- **Thumbnails, transcoding, antivirus:** Can be added as post-processing steps or background jobs that update the same `Media` row or related tables; schema and service stay storage-provider friendly.

## Persian / Unicode

- `originalName` is stored as nullable string (VarChar 512); safe for Unicode and RTL.
- API responses return `originalName` as-is for frontend display.

## Migration

```bash
npx prisma migrate dev --name add_media_and_message_media
npx prisma generate
```
