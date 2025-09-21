# Backend: Postgres + Migrations

This backend setup provides a local Postgres via Docker Compose and SQL migrations to create the `todos` table, triggers, and indexes.

## Prerequisites

- Docker Desktop or Docker Engine
- psql (optional, for running migrations from your host)

## Start Postgres

From the project root (or the `backend/` directory):

```bash
# start postgres in the background
docker compose -f backend/docker-compose.yml up -d

# view logs
docker compose -f backend/docker-compose.yml logs -f postgres
```

The database will be available at:

- Host: `localhost`
- Port: `5432`
- Database: `app`
- User: `app`
- Password: `app`

## Run initial migration

Using `psql` from your host:

```bash
psql "postgres://app:app@localhost:5432/app" -f backend/migrations/001_init_up.sql
```

Alternatively, exec into the container and run the migration there:

```bash
docker compose -f backend/docker-compose.yml exec -u postgres postgres bash -lc "psql -U app -d app -f /migrations/001_init_up.sql"
```

> Note: The container does not mount migrations by default. The recommended path is running from your host with `psql` as shown above.

## What the migration does

- **Table**: `todos` with columns `id`, `title`, `completed`, `created_at`, `updated_at`, `completed_at`
- **Defaults**: `created_at` and `updated_at` default to `now()` on insert (so `updated_at = created_at` initially)
- **Triggers/Functions**:
  - Keep `created_at` immutable on updates
  - Update `updated_at` on title change
  - On `completed` change: set/clear `completed_at` and update `updated_at`, ensuring `updated_at == completed_at` when marking complete
- **Indexes**: on `completed`, `completed_at`, `created_at`

## Down migration (rollback)

```bash
psql "postgres://app:app@localhost:5432/app" -f backend/migrations/001_init_down.sql
```

## Connecting from the app

Use a standard Postgres connection string:

```
postgres://app:app@localhost:5432/app
```

## Customization

- Update `backend/docker-compose.yml` env vars if you want different credentials
- Add additional migrations as needed in `backend/migrations/` (use semantic numbering)
