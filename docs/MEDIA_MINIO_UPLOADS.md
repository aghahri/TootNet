## MinIO-backed media uploads

This project uses MinIO (S3-compatible) for binary media storage.

### Env vars

- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET` (defaults to `toot-media` if unset)

### Storage layout

Objects are stored in the `toot-media` bucket (or `MINIO_BUCKET`) with these prefixes:

- `images/` — image files (`image/*`)
- `video/` — video files (`video/*`)
- `voice/` — audio/voice (`audio/*`)
- `files/` — other allowed files (e.g. PDF, ZIP)

### Endpoint

`POST /media/upload` (authenticated)

Request:

- Multipart/form-data with field `file`
- Max size: **20MB**

Validation:

- Allowed MIME types:
  - `image/*`
  - `video/*`
  - `audio/*`
  - `application/pdf`
  - `application/zip`, `application/x-zip-compressed`

Response JSON:

```json
{
  "url": "https://<minio-host>/<bucket>/<key>",
  "key": "images/...",
  "size": 12345,
  "mimeType": "image/png",
  "media": {
    "id": "...",
    "type": "IMAGE" | "VIDEO" | "FILE",
    "url": "...",
    "size": 12345,
    "mimeType": "image/png",
    "originalName": "foo.png",
    "createdAt": "..."
  }
}
```

The `media` object is the row created in the `Media` table and is compatible with existing message logic.

