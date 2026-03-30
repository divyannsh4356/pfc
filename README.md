# PFC Phase 1 - Database + Authentication

## Structure

- `backend`: Express + PostgreSQL + JWT authentication
- `frontend`: React login + protected routing

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_PASSWORD`
- `PORT` (default `3001`)
- `CLIENT_URL` (default `http://localhost:3000`)

## Backend setup

1. Install dependencies in `backend`
2. Initialize DB schema:
   - Run `npm run db:init`
3. Start backend:
   - Run `npm run dev`

On startup, backend seeds one admin user:

- `team_name`: `admin`
- `role`: `admin`
- password: from `ADMIN_PASSWORD`

## Frontend setup

1. Install dependencies in `frontend`
2. Start frontend:
   - Run `npm run dev`

Optional frontend env:

- `VITE_API_URL` (defaults to `http://localhost:3001`)

## Auth API

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

All errors use:

```json
{
  "error": "message",
  "code": "OPTIONAL_CODE"
}
```
