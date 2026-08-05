# Melo

Melo is a private, realtime emotion-sharing space with one-to-one conversations and friend-only groups. It includes a responsive React session room, male and female CSS avatars, 16 emotion controls, and a NestJS Socket.IO gateway that synchronizes room state for up to 12 participants.

## Requirements

- Node.js 20.17 or newer
- npm 11 or newer

## Run locally

```powershell
npm install
docker compose up -d postgres
npm run db:deploy --workspace api
npm run dev:api
```

In a second terminal:

```powershell
npm run dev:web
```

Open `http://localhost:5173`. Use the development login locally, then open a second browser profile or private window with a different display name to test friendships and realtime emotion synchronization.

PostgreSQL is exposed on local port `5433` to avoid conflicts with an existing PostgreSQL installation. Copy [apps/api/.env.example](apps/api/.env.example) to `apps/api/.env`; local secrets are gitignored.

## Google sign-in

Create a Google OAuth web application with this authorized redirect URI:

```text
http://localhost:3001/auth/google/callback
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`. Without them, the API returns `503` and local development login remains available. Development login is disabled when `NODE_ENV=production`.

## Deploy to shivnpsiv.com

The production deployment uses one Render web service for React, NestJS, and Socket.IO, plus Render PostgreSQL. The included [render.yaml](render.yaml) provisions both services. Keeping the browser and API on one origin makes secure cookies and WebSockets work without cross-domain configuration.

1. Push this repository to GitHub or GitLab.
2. In Render, select **New > Blueprint**, connect the repository, and deploy `render.yaml`.
3. Enter `GOOGLE_CLIENT_ID` and a newly rotated `GOOGLE_CLIENT_SECRET` when Render requests the unsynced variables.
4. The Blueprint registers `shivnpsiv.com` as the custom domain. Render also provisions the corresponding `www` redirect.
5. In Cloudflare DNS, create the records Render displays under **Settings > Custom Domains**. Keep them **DNS only** until Render verifies the domains and issues certificates; the Cloudflare proxy can be enabled afterward.
6. In Cloudflare SSL/TLS, use **Full (strict)** and enable **Always Use HTTPS**.
7. In the Google OAuth web client, add:

```text
Authorized JavaScript origin: https://shivnpsiv.com
Authorized redirect URI:      https://shivnpsiv.com/auth/google/callback
```

Render builds all workspaces, applies pending Prisma migrations at startup, starts the API, and serves the built frontend from the same process. WebSockets use the same `wss://shivnpsiv.com` origin automatically. After upgrading the web service to a paid plan, the migration command can be moved to Render's dedicated pre-deploy command.

The Blueprint starts on Render's free service and database plans to avoid an automatic charge. Free services can sleep and are suitable for initial testing; move the web service to `starter` and PostgreSQL to `basic-256mb` before relying on always-available WebSocket sessions and durable production storage.

Do not commit `apps/api/.env`. The previously shared Google client secret should be rotated before production deployment.

## Validate

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Current scope

- Shared Zod schemas and typed Socket.IO events
- Google OAuth and opaque, hashed, revocable cookie sessions
- Persistent profiles with unique usernames and avatar selection
- Exact username discovery and friend request accept/decline/cancel flows
- Canonical, unique friendships and unfriend controls
- PostgreSQL persistence through Prisma migrations
- Persistent direct and group room membership with friend-only invitations
- Session-cookie-authenticated Socket.IO joins with database-backed room authorization
- In-memory live presence and emotion state with a 12-participant limit
- Persistent mood until changed or reset to neutral
- Responsive session grid and direct access to all 16 emotions
- CSS avatar poses and transitions with reduced-motion support

Redis fan-out, persisted emotion events and private recaps, room invitation acceptance, and production Rive assets remain for later phases. Live presence and current emotion state remain in memory, while room membership is persisted and authorized through PostgreSQL.
