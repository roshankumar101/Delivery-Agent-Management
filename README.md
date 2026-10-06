# Delivery Agent Management System

A full-stack admin application for managing delivery agents, tracking profile changes, restoring soft-deleted records, and reviewing operational analytics.

## Features

- Admin authentication with JWT bearer tokens.
- Create, search, filter, paginate, view, update, and soft-delete delivery agents.
- Immutable, sequential modification history for agent updates.
- Trash recovery during a three-day retention window, followed by scheduled permanent deletion.
- Dashboard totals, agent analytics, and filtered CSV export.
- Redis-backed response caching with database fallback when Redis is unavailable.
- Responsive React interface with Tailwind CSS utilities, system-aware light/dark mode, and a persistent theme toggle.
- Interactive Swagger UI and a raw OpenAPI specification.

## Technology

- **Client:** React, TypeScript, Vite, Tailwind CSS v4 (Vite plugin), React Router, Axios
- **Server:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis
- **API documentation:** OpenAPI 3.0.3, Swagger UI

## Project layout

```text
client/                React application
server/                Express API and Prisma schema/migrations
.env.example           Root environment template for local development
PROGRESS.md             Implementation phase tracker
```

## Prerequisites

- Node.js and npm compatible with the versions required by the client and server dependencies.
- PostgreSQL, with an empty database created for this application.
- Redis is recommended for caching. The API logs Redis connection failures and serves requests from PostgreSQL when Redis is unavailable.
- Docker with the Docker Compose plugin for the containerized setup below.

## Docker setup

From a clone of the repository, copy the example environment file and start the stack:

```sh
git clone <repository-url>
cd delivery-agent-management
cp .env.example .env
docker compose up --build
```

Docker Compose reads the root `.env` automatically, so no shell exports are needed. The copied `.env.example` includes example local credentials and can start the stack as-is. To use different admin credentials, edit `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env` before starting Docker. `.env` is local only and must not be committed; `.env.example` is safe to commit and contains no real admin password.

The backend waits for PostgreSQL and Redis to become healthy, generates Prisma Client, applies committed migrations with `prisma migrate deploy`, and runs the Prisma admin seed before starting the API. Prisma Client is also generated at image build time so the backend can be compiled. The seed hashes the password with bcrypt before storing it. It is idempotent: if the configured email already exists, it leaves that account unchanged. Changing only the password for an existing email will not update that account; using a different email creates another admin and does not remove the previous one.

Open the app at `http://localhost:8080` and sign in with the email and password currently configured in `.env`. The API is available at `http://localhost:5000`. The admin password is only passed to the backend and is never included in the frontend build.

## Local development

All application environment variables are read from the repository-root `.env` file. In PowerShell, create it from the template:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set a strong, private `JWT_SECRET`, a valid PostgreSQL `DATABASE_URL`, and unique development admin details. Keep `.env` private; it must not be committed. The template `DATABASE_URL` is only a placeholder and must be replaced with credentials for your local PostgreSQL instance, for example:

```text
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/delivery_agent_management?schema=public
```

Set `REDIS_URL` to your Redis connection URL if Redis is enabled. `PORT` defaults to `5000`, and the client API URL defaults to `http://localhost:5000/api`.

Install dependencies from each application directory:

```powershell
Set-Location server
npm install
Set-Location ..\client
npm install
```

From `server/`, generate Prisma Client and apply the committed migrations to the configured database:

```powershell
npm run prisma:generate
npm run prisma:migrate:deploy
```

Create the initial administrator using `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from the root `.env`. The development-only command requires a password of at least 12 characters and refuses to overwrite an existing account:

```powershell
npm run admin:create:dev
```

Start the API and client in separate PowerShell terminals:

```powershell
# Terminal 1
Set-Location server
npm run dev
```

```powershell
# Terminal 2
Set-Location client
npm run dev
```

Open the Vite URL shown in the client terminal (typically `http://localhost:5173`) and sign in with the development admin account.

## API reference

With the API running, visit:

- Swagger UI: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- OpenAPI JSON: [http://localhost:5000/api-docs/openapi.json](http://localhost:5000/api-docs/openapi.json)
- Health endpoint: [http://localhost:5000/health](http://localhost:5000/health)

Authenticated API routes use `Authorization: Bearer <token>`. The API includes:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Authenticate an admin |
| `GET` | `/api/auth/me` | Retrieve the current admin |
| `GET` | `/api/agents` | List/filter agents with pagination |
| `POST` | `/api/agents` | Create an agent |
| `GET` | `/api/agents/:id` | Retrieve an agent |
| `PATCH` | `/api/agents/:id` | Update an agent |
| `DELETE` | `/api/agents/:id` | Move an agent to trash |
| `GET` | `/api/agents/:id/history` | Retrieve modification history |
| `GET` | `/api/agents/trash` | List deleted agents |
| `POST` | `/api/agents/:id/restore` | Restore an agent |
| `GET` | `/api/agents/stats` | Retrieve dashboard totals |
| `GET` | `/api/agents/analytics` | Retrieve operational trends |
| `GET` | `/api/agents/export` | Download filtered agents as CSV |

Agent listing accepts `page`, `limit`, `search`, `status`, and `serviceArea`. CSV export accepts `search`, `status`, and `serviceArea`.

## Useful commands

Run these from the indicated application directory:

| Directory | Command | Description |
| --- | --- | --- |
| `client/` | `npm run lint` | Lint the client |
| `client/` | `npm run build` | Type-check and build the client |
| `client/` | `npm run preview` | Preview a production client build |
| `server/` | `npm run build` | Compile the API |
| `server/` | `npm run prisma:generate` | Generate Prisma Client |
| `server/` | `npm run prisma:migrate:status` | Check database migration status |
| `server/` | `npm run prisma:migrate:deploy` | Apply committed migrations |

## Operational notes

- The cleanup job starts with the API and runs every 24 hours. It permanently removes agents whose soft-delete timestamp is at least three days old; related modification records are deleted by the database cascade.
- Lifecycle analytics are stored separately from agent records so delete/restore counts remain available after an agent is permanently removed.
- Redis is an optimization, not a requirement for serving API reads. When unavailable, requests use PostgreSQL.
- Configure production secrets and service URLs through the deployment environment. Never use the development admin command in production.
- Database migrations must be applied before starting the application against a new database.

## Implementation and validation status

See [PROGRESS.md](./PROGRESS.md) for the phase tracker and validation details. Frontend/backend builds, Prisma Client generation, Compose configuration and image builds, and targeted authenticated read-only API checks have passed. Full interactive CRUD testing remains pending; no project test suite is currently configured.
