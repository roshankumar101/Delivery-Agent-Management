# Delivery Agent Management System

A web application for administrators to manage delivery agents, review changes, recover deleted records, and monitor operational statistics.

## 1. Project Overview

The Delivery Agent Management System gives an administrator one place to maintain delivery-agent profiles and inspect their operational status. It supports searchable, filterable agent records, dashboard summaries, analytics, CSV export, and a recoverable trash workflow.

The browser client is built with React and TypeScript and communicates with an Express REST API. The API persists records in PostgreSQL through Prisma and uses Redis for short-lived response caching.

## 2. Key Features

### Core / Assignment Features

- Create, view, edit, and remove delivery agents from active lists.
- Search agent names, email addresses, phone numbers, and service areas.
- Filter by active/inactive status and service area; the service-area filter supports selecting multiple fixed options.
- Paginate agent lists and choose a page size.
- Persist users, agents, and modification history in PostgreSQL through Prisma.
- Provide a REST API with validation, consistent success/error responses, and centralized error handling.
- Cache read responses in Redis and invalidate relevant entries after agent changes.
- Provide a responsive browser interface and interactive API documentation.

### Additional Implemented Features

- Admin sign-in with one-hour JWT bearer tokens and bcrypt password hashing.
- Environment-configured initial admin account; the seed reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
- Dashboard totals for agents, active/inactive status, deleted agents, and service areas.
- Analytics for service-area and status distributions, 12-month creation/modification/lifecycle trends, and lifetime lifecycle totals.
- Agent detail view with complete, sequential modification history.
- Soft delete, a Trash view with remaining retention time, and restore.
- Scheduled permanent deletion of agents after three days in Trash.
- CSV download for agent records, with the list filters applied on the Agents page.
- Fixed service-area choices in add/edit forms and the multi-select list filter. The filter’s “All areas” option is not a valid agent service area.
- Persistent light/dark theme that follows the system setting until a preference is selected.
- Loading, empty, error, and action-feedback states.
- Lucide React icons on selected navigation and action controls.
- Docker Compose setup for the client, API, PostgreSQL, and Redis.
- Swagger UI and a raw OpenAPI 3.0.3 document.

## 3. Tech Stack

### Frontend

- React 19, TypeScript, Vite
- React Router
- Axios
- Tailwind CSS v4 with the Vite plugin
- Lucide React

### Backend

- Node.js, Express 5, TypeScript
- Redis client (`redis`)
- `dotenv`, `bcryptjs`, `jsonwebtoken`

### Database

- PostgreSQL
- Prisma ORM and Prisma PostgreSQL adapter

### Cache

- Redis

### Authentication

- JWT bearer tokens
- bcryptjs password hashing

### Infrastructure

- Docker
- Docker Compose

### API Documentation

- OpenAPI 3.0.3
- Swagger UI Express

## 4. Architecture

```text
Browser
   │
   ▼
React + TypeScript ── Axios ──► Express REST API
                                  │
                                  ├── Redis (read cache)
                                  │
                                  └── Prisma ──► PostgreSQL
```

Backend requests flow through the matching Express route and controller into a service. Read services use Redis when it is ready and Prisma/PostgreSQL as the source of truth. A cache outage bypasses Redis rather than preventing database reads. Agent mutations invalidate the relevant cached agent, list, and statistics entries.

## 5. Project Structure

```text
delivery-agent-management/
├── client/
│   ├── public/
│   └── src/
│       ├── api/           # Axios API client
│       ├── auth/          # Authentication state and route protection
│       ├── components/    # Shared header, forms, and theme
│       ├── constants/     # Shared service-area options
│       ├── pages/         # Dashboard, agents, trash, analytics, login
│       └── types/
├── server/
│   ├── prisma/            # Schema and migrations
│   └── src/
│       ├── config/        # Prisma and Redis clients
│       ├── controllers/
│       ├── docs/          # OpenAPI definition
│       ├── jobs/          # Scheduled retention cleanup
│       ├── middleware/
│       ├── routes/
│       ├── scripts/       # Admin seed/creation
│       └── services/
├── docker-compose.yml
├── .env.example
├── PROGRESS.md
└── README.md
```

## 6. Quick Setup & Evaluation

### Prerequisites

- Git
- Docker Desktop or Docker Engine with the Docker Compose plugin

The repository includes a root [`docker-compose.yml`](./docker-compose.yml) that starts the frontend, backend, PostgreSQL, and Redis together. The Compose stack supplies PostgreSQL and Redis; they do not need to be installed separately for this workflow.

### Step 1 — Clone

```bash
git clone https://github.com/roshankumar101/Delivery-Agent-Management.git
cd Delivery-Agent-Management
```

### Step 2 — Configure the environment

Copy the root [`.env.example`](./.env.example) template to `.env`, then edit `.env` with your local evaluation credentials and settings:

```bash
cp .env.example .env
```

On Windows PowerShell, the equivalent copy command is:

```powershell
Copy-Item .env.example .env
```

Set a private `JWT_SECRET`, a unique `ADMIN_NAME` and `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD`. For Compose networking, set:

```dotenv
REDIS_URL=redis://redis:6379
```

The template’s `redis://localhost:6379` is for running the backend directly on the host. Containers must use the Compose service hostname `redis`. Compose supplies the backend’s PostgreSQL connection internally; `DATABASE_URL` in `.env` is used for local, non-container development.

Keep `.env` local and do not commit it. `.env.example` contains placeholders, not credentials for an evaluator account.

### Step 3 — Start the full stack with `docker-compose.yml`

```bash
docker compose -f docker-compose.yml up --build -d
```

Compose starts PostgreSQL and Redis, waits for their health checks, then builds and starts the backend and client. Backend startup generates Prisma Client, applies committed migrations, runs the admin seed, and starts the API. The seed creates the configured admin if its email is new; on later starts it synchronizes that account’s name but does not change its password.

To follow startup output:

```bash
docker compose logs -f backend
```

### Step 4 — Evaluate

Open the client at [http://localhost:8080](http://localhost:8080), sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`, and follow the [Feature Walkthrough](#9-feature-walkthrough) and [Evaluation Checklist](#14-evaluation-checklist).

Stop the stack while preserving the database volume:

```bash
docker compose down
```

For a fresh evaluation database only, `docker compose down -v` also removes the PostgreSQL volume and permanently deletes its local data. Use that only when you intend to reset the evaluation data.

## 7. Application URLs

| Resource | URL |
| --- | --- |
| Web application | [http://localhost:8080](http://localhost:8080) |
| API health | [http://localhost:5000/health](http://localhost:5000/health) |
| Swagger UI | [http://localhost:5000/api-docs](http://localhost:5000/api-docs) |
| Raw OpenAPI JSON | [http://localhost:5000/api-docs/openapi.json](http://localhost:5000/api-docs/openapi.json) |

## 8. Admin Login

The Compose seed reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from the root `.env`. It stores a bcrypt hash of the password in PostgreSQL; the password is not sent to or bundled into the frontend. The configured name and email are returned as the authenticated user after login.

On a first run with a new PostgreSQL volume, use the email and password currently set in `.env`. If the same email already exists from an earlier run, the seed updates its name but leaves its password unchanged.

## 9. Feature Walkthrough

1. **Sign in** with the configured admin credentials. Protected pages redirect unauthenticated users to login.
2. **Dashboard** shows current totals and provides a CSV export.
3. **Agents** supports add/edit, search, status filtering, multi-select service-area filtering, URL-synchronized filters, page-size selection, and pagination. The fixed agent service-area choices are Bangalore, Delhi, Gurgaon, Pune, Noida, Mumbai, Hyderabad, Chennai, Kolkata, Ahmedabad, and Jaipur.
4. **Agent details** shows contact and status information plus the full modification history. Meaningful edits append sequential history entries.
5. **Trash** lists soft-deleted agents with deletion time and remaining retention time. Restore returns an agent to the active list.
6. **Analytics** summarizes service areas, status, creation and modification trends, and delete/restore/permanent-delete activity.
7. **Theme and navigation** are available from the shared header across authenticated pages. The light/dark choice persists and can follow the system preference.

Permanent deletion is scheduled by the backend once an agent has remained in Trash for three days. It is not an immediate UI action.

## 10. Redis Caching

Redis is provided by Compose as the `redis` service. The Compose backend connects using `redis://redis:6379`; when running the backend directly on the host, use `redis://localhost:6379`.

The backend reuses one Redis client and caches read results with expiration:

| Data | Key pattern | TTL |
| --- | --- | --- |
| Agent list/search/filter/page results | `agents:list:<query-hash>` | 30 seconds |
| Agent detail | `agent:<id>` | 60 seconds |
| Dashboard statistics | `agents:stats` | 30 seconds |
| Analytics | `agents:analytics:<month>` | 60 seconds |
| Trash list | `agents:trash` | 30 seconds |

List keys are derived from all list options, including page, limit, search, status, and service area. Successful reads return `X-Cache: HIT` or `X-Cache: MISS`; when Redis is unavailable they return `X-Cache: BYPASS` and load from PostgreSQL.

Create, update, soft delete, restore, and scheduled permanent deletion invalidate relevant agent, list, statistics, analytics, and trash entries. Invalidation scans only the application’s key patterns; it does not flush the Redis database.

### Verify Redis locally

1. Open the Agents page or Dashboard to request cached data, then repeat the same request within its TTL.
2. In the browser developer tools, inspect the authenticated request’s response headers. A first cacheable read should report `X-Cache: MISS`; a repeat may report `HIT`.
3. Inspect keys from a separate terminal:

   ```bash
   docker compose exec redis redis-cli --scan --pattern 'agents:*'
   docker compose exec redis redis-cli --scan --pattern 'agent:*'
   ```

These steps document how to inspect caching; the README does not assume a Redis runtime check has been performed.

## 11. Database & Prisma

PostgreSQL is the source of truth. The Prisma schema defines:

- `User` for administrator accounts.
- `DeliveryAgent` for agent records and soft-delete timestamps.
- `AgentModification` for sequential field-level edit history, cascading when its agent is permanently deleted.
- `AgentLifecycleEvent` for delete, restore, and permanent-delete analytics that remain after an agent row is removed.

Compose applies the checked-in migrations with `prisma migrate deploy` before starting the backend. The agent cleanup job runs at backend startup and every 24 hours, deleting records whose soft-delete timestamp is at least three days old.

## 12. API Documentation

With the Compose stack running, use [Swagger UI](http://localhost:5000/api-docs) to browse and try the OpenAPI-documented routes. The raw specification is available at [http://localhost:5000/api-docs/openapi.json](http://localhost:5000/api-docs/openapi.json).

Authenticated API routes use a bearer token returned by `POST /api/auth/login`.

## 13. API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health |
| `POST` | `/api/auth/login` | Admin sign-in |
| `GET` | `/api/auth/me` | Current authenticated admin |
| `POST` | `/api/agents` | Create an agent |
| `GET` | `/api/agents` | Search, filter, and paginate agents |
| `GET` | `/api/agents/:id` | Agent details |
| `PATCH` | `/api/agents/:id` | Update an agent and record meaningful changes |
| `DELETE` | `/api/agents/:id` | Soft-delete an agent |
| `GET` | `/api/agents/:id/history` | Agent modification history |
| `GET` | `/api/agents/trash` | List soft-deleted agents |
| `POST` | `/api/agents/:id/restore` | Restore an agent |
| `GET` | `/api/agents/stats` | Dashboard statistics |
| `GET` | `/api/agents/analytics` | Operational analytics |
| `GET` | `/api/agents/export` | Download CSV |

Agent listing accepts `page`, `limit`, `search`, `status`, and `serviceArea`. For multiple service areas, send comma-separated values, for example `serviceArea=Bangalore,Delhi`. CSV export accepts `search`, `status`, and `serviceArea` filters.

## 14. Evaluation Checklist

- [ ] Start the full stack with Docker Compose and confirm all four services are running.
- [ ] Sign in with the configured admin account; refresh the page and confirm the session is restored.
- [ ] Create an agent using a fixed service-area option, then search and filter the agent list.
- [ ] Select multiple service areas and verify the results; combine the selection with status, search, and pagination.
- [ ] Edit an agent and review its modification history.
- [ ] Export the current agent set as CSV.
- [ ] Soft-delete an agent, find it in Trash, and restore it.
- [ ] Review dashboard statistics and analytics after changing agent records.
- [ ] Switch light/dark theme and confirm the choice persists after refresh.
- [ ] Sign out and confirm protected pages require authentication.
- [ ] Inspect `X-Cache` response headers and Redis keys as described in the Redis section.
- [ ] Browse the documented routes in Swagger UI.

Use disposable evaluation records. The scheduled three-day retention cleanup permanently deletes expired records and is intentionally not triggered by the checklist.

## 15. Screenshots

No application screenshots are currently included in the repository. Screenshots can be added to a repository `screenshots/` directory and linked here when available.

## 16. Local Development

For development without Docker, install a compatible Node.js runtime and provide local PostgreSQL and Redis services. Create a root `.env` from `.env.example`; set `DATABASE_URL` to the local database, `REDIS_URL=redis://localhost:6379`, and the admin/JWT values. `PORT` defaults to `5000`, and the client API URL defaults to `http://localhost:5000/api`.

Install dependencies in each application:

```bash
cd server
npm install
cd ../client
npm install
```

From `server/`, generate Prisma Client, apply the migrations, and create an initial admin account:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run admin:create:dev
```

The development admin command refuses to overwrite an existing email and requires an admin password of at least 12 characters.

Start the backend and client in separate terminals:

```bash
# Terminal 1
cd server
npm run dev
```

```bash
# Terminal 2
cd client
npm run dev
```

The Vite client is typically available at [http://localhost:5173](http://localhost:5173); the API remains at [http://localhost:5000](http://localhost:5000). Useful project scripts include `npm run build` and `npm run lint` in `client/`, and `npm run build` in `server/`.

