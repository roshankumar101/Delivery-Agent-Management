# Delivery Agent Management System

A full-stack application for administrators to manage delivery agents, review changes, and monitor operational activity. It provides admin authentication, agent CRUD, search, filtering and pagination, soft delete and restore, modification history, Redis caching, PostgreSQL persistence, analytics and statistics, CSV export, and Swagger/OpenAPI documentation.

## Production Demo

Production Application: [https://delivery-agent-management.vercel.app/](https://delivery-agent-management.vercel.app/)

The frontend is deployed on Vercel, with the backend deployed separately on AWS EC2. The production frontend and backend communicate over HTTPS. For evaluation, use the local Docker setup below.

## Quick Start

### Prerequisites

- Git
- Docker with Docker Compose

Docker Compose starts the frontend, backend, PostgreSQL, and Redis services. The evaluator does not need to install PostgreSQL or Redis separately.

### 1. Clone the repository

```bash
git clone https://github.com/roshankumar101/Delivery-Agent-Management.git delivery-agent-management
cd delivery-agent-management
```

### 2. Create and configure `.env`

Copy the provided [`.env.example`](./.env.example) file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace the example `JWT_SECRET` and `ADMIN_PASSWORD` with private values. Set the admin name and email you want to use for evaluation. The provided example already sets `REDIS_URL=redis://redis:6379`, which is the correct address for Redis from the backend container. The Compose configuration supplies its PostgreSQL connection and uses the default local frontend/API URLs.

The example admin credentials are placeholders, not shared evaluation credentials. Sign in using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values you set in `.env`. Do not commit `.env` or put private values in this README.

### 3. Build and start the application

Run this from the repository root:

```bash
docker compose up --build
```

Compose starts PostgreSQL and Redis, waits for their health checks, then starts the backend and frontend. The backend generates Prisma Client, applies the checked-in database migrations, synchronizes the configured admin account, and starts the API. The first image build may take several minutes.

Leave this terminal running while evaluating the application. Press `Ctrl+C` to stop the services. To stop the stack later from another terminal, run `docker compose down`. This retains the database volume.

### 4. Open the application

| Service | URL |
| --- | --- |
| Web application | [http://localhost:8080](http://localhost:8080) |
| API health | [http://localhost:5000/health](http://localhost:5000/health) |
| Swagger UI | [http://localhost:5000/api-docs](http://localhost:5000/api-docs) |
| OpenAPI JSON | [http://localhost:5000/api-docs/openapi.json](http://localhost:5000/api-docs/openapi.json) |

## Features

### Agent management

- Create, view, edit, and soft-delete delivery-agent records.
- Search and filter by status and service area; select multiple service areas.
- Paginate results and choose the page size.
- Use fixed service-area choices in the add/edit form.
- Export agent records as CSV.
- Review sequential modification history on the agent details page.
- Restore agents from Trash. Agents retained there for three days are permanently deleted by the scheduled cleanup.

### Dashboard and analytics

- View agent and status statistics on the dashboard.
- Review service-area and status distributions, creation and modification trends, and deletion/restoration activity.

### Authentication and interface

- Admin login uses bcrypt-hashed passwords and JWT bearer tokens with a one-hour expiry.
- The initial admin account is configured through `.env`.
- Responsive interface with loading, empty, and error states.
- Light/dark theme preference persists in the browser.

## Feature Walkthrough

1. Sign in using the admin email and password configured in `.env`.
2. Review dashboard totals, then open Agents to browse, search, filter, and paginate agent records.
3. Add an agent by selecting a service area. Edit an agent and review its modification history from its detail page.
4. Export agent data as CSV.
5. Move an agent to Trash, restore it, and verify that it returns to the active list.
6. Review dashboard analytics after making changes.
7. Use Swagger UI to browse the documented API routes.

## Architecture

```text
Browser
   │
   ▼
React + TypeScript ── Axios ──► Express REST API
                                  │
                                  ├── Redis (cache)
                                  │
                                  └── Prisma ──► PostgreSQL
```

Express routes pass requests through controllers to services. PostgreSQL is the source of truth. Redis caches selected read results; when Redis is unavailable, requests fall back to PostgreSQL.

## Technology

- **Frontend:** React, TypeScript, Vite, React Router, Axios, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Prisma
- **Cache:** Redis
- **Authentication:** JWT, bcryptjs
- **Local stack:** Docker Compose
- **API documentation:** OpenAPI 3.0.3, Swagger UI

## Repository Structure

```text
delivery-agent-management/
├── client/                 # React application
│   └── src/
│       ├── components/
│       ├── pages/
│       └── types/
├── server/                 # Express API
│   ├── prisma/             # Schema and migrations
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── routes/
│       └── services/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Redis Caching

The backend reuses a Redis client and uses cache-aside reads with TTLs:

| Data | Key | TTL |
| --- | --- | --- |
| Agent list and query variants | `agents:list:<query-hash>` | 30 seconds |
| Agent detail | `agent:<id>` | 60 seconds |
| Dashboard statistics | `agents:stats` | 30 seconds |
| Analytics | `agents:analytics:<month>` | 60 seconds |
| Trash list | `agents:trash` | 30 seconds |

Agent list cache keys include the query options, including search, status, service area, page, and limit. Cacheable responses include the `X-Cache` header with `HIT`, `MISS`, or `BYPASS`. Create, update, soft delete, restore, and permanent cleanup invalidate relevant cache entries. Redis failures do not prevent reads from PostgreSQL.

To inspect Redis keys while the Compose stack is running:

```bash
docker compose exec redis redis-cli --scan --pattern 'agents:*'
docker compose exec redis redis-cli --scan --pattern 'agent:*'
```

## Database

PostgreSQL stores admin accounts, delivery agents, modification records, and lifecycle events. Prisma migrations are applied automatically during backend startup in the Compose setup. The PostgreSQL data is kept in a named Docker volume when the stack is stopped with `docker compose down`.

## API Overview

Agent and statistics routes require authentication. Sign in through the login endpoint and provide the returned JWT as a bearer token for protected requests.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health |
| `POST` | `/api/auth/login` | Admin sign-in |
| `GET` | `/api/auth/me` | Current admin |
| `POST` | `/api/agents` | Create an agent |
| `GET` | `/api/agents` | Search, filter, and paginate agents |
| `GET` | `/api/agents/:id` | Agent details |
| `PATCH` | `/api/agents/:id` | Update an agent |
| `DELETE` | `/api/agents/:id` | Soft-delete an agent |
| `GET` | `/api/agents/:id/history` | Agent modification history |
| `GET` | `/api/agents/trash` | List deleted agents |
| `POST` | `/api/agents/:id/restore` | Restore an agent |
| `GET` | `/api/agents/stats` | Dashboard statistics |
| `GET` | `/api/agents/analytics` | Operational analytics |
| `GET` | `/api/agents/export` | Download CSV |

The agent list accepts `page`, `limit`, `search`, `status`, and `serviceArea` query parameters. Multiple service areas can be comma-separated. Swagger UI at `/api-docs` provides the interactive API documentation.

## Evaluation Checklist

- [ ] Start the stack using the Quick Start instructions.
- [ ] Sign in using the admin account configured in `.env`.
- [ ] Create an agent and confirm it appears in the agent list.
- [ ] Search, filter by status and multiple service areas, and paginate the list.
- [ ] Edit the agent and inspect its modification history.
- [ ] Download the CSV export.
- [ ] Soft-delete the agent, restore it from Trash, and confirm it is active again.
- [ ] Review dashboard statistics and analytics.
- [ ] Change the theme and refresh the page to confirm the preference persists.
- [ ] Inspect Swagger UI and the Redis cache headers/keys.

Use test records for evaluation. Agents that remain in Trash for three days are permanently deleted by scheduled cleanup.

## Local Development

For development without Docker, install Node.js and provide local PostgreSQL and Redis instances. Use the root `.env.example` as a starting point; when the backend runs directly on the host, set `REDIS_URL=redis://localhost:6379`. The client uses `VITE_API_URL` as the backend origin and appends `/api`.

The client and server have separate package manifests and scripts. The client provides `dev`, `build`, `lint`, and `preview`; the server provides `dev`, `build`, `start`, Prisma migration scripts, and admin seed scripts.

