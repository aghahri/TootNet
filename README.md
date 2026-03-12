# Toot Backend

NestJS backend for the Toot social messaging platform (Network / Groups / Channels).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your PostgreSQL connection string
   - Set `JWT_SECRET` (use a strong secret in production)

3. **Database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Run**
   ```bash
   npm run start:dev
   ```

API base: `http://localhost:3000`

## Auth endpoints (public)

- `POST /auth/register` — Register (body: email, password, name, optional: mobile, bio)
- `POST /auth/login` — Login (body: email, password)
- `POST /auth/refresh` — New access token (body: refreshToken)
- `POST /auth/logout` — Invalidate refresh (body: refreshToken)

Protected routes require header: `Authorization: Bearer <access_token>`.

## Health

- `GET /health` — Returns `{ status: 'ok', timestamp }`
