# Rate Limiting (Step 6.1)

## Overview

Rate limiting is applied via `@nestjs/throttler` with a global default and stricter overrides on sensitive endpoints.

## Configuration

- **Default:** 100 requests per 60 seconds (per tracker, typically IP) for all routes.
- **Overrides (per endpoint):**
  - **Login / Register:** 5 requests per 60 seconds.
  - **Refresh token:** 10 requests per 60 seconds.
  - **Report message:** 10 requests per 60 seconds.
  - **Send message (group/channel):** 30 requests per 60 seconds.
  - **Notifications list (polling):** 30 requests per 60 seconds.

Env vars (optional):

- `THROTTLE_TTL_MS` — default 60000 (1 minute).
- `THROTTLE_DEFAULT_LIMIT` — default 100.
- `REDIS_URL` — when set, can be used to plug a Redis-backed storage (see below).

## Storage

- **MVP:** In-memory storage (single instance). Counts are per process.
- **Production / multi-instance:** Use Redis so all instances share the same counters. Implement by:
  1. Adding `@nest-lab/throttler-storage-redis` and `ioredis`.
  2. In `AppThrottlerModule` `useFactory`, if `config.get('redis.url')` is set, create a Redis client and pass a `ThrottlerStorage` implementation that uses it (e.g. `ThrottlerStorageRedisService`) as the `storage` option.

## Applied endpoints

| Endpoint / area        | Limit (per 60s) |
|------------------------|-----------------|
| Default (all others)   | 100             |
| POST /auth/register   | 5               |
| POST /auth/login      | 5               |
| POST /auth/refresh    | 10              |
| POST /messages/report | 10              |
| POST /groups/:id/messages | 30         |
| POST /channels/:id/messages | 30        |
| GET /notifications    | 30              |

## Design choices

- **Global guard:** `ThrottlerGuard` is registered as `APP_GUARD` so every request is subject to a limit; `@Throttle()` overrides the default only where applied.
- **Tracker:** Default is request IP. For authenticated routes you can customize via `getTracker` to use user id if needed.
- **Redis:** Not required for MVP; architecture allows swapping in Redis storage without changing controllers.
