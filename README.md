# svelte-todos

A full‑stack Todo application built with SvelteKit + Tailwind CSS on the frontend and a simple Postgres‑backed API on the server. The app demonstrates modern data‑fetching with TanStack Query and headless table features with TanStack Table Core, including filtering, sorting, and inline editing with optimistic mutations.

## Top‑level structure

- **Frontend (SvelteKit)**
  - `src/routes/+page.svelte` — main Todo UI (add, edit, toggle, delete) with filtering/sorting and persistence of table UI state to `localStorage`.
  - `src/lib/components/HeaderSort.svelte` — small UI component to show a sortable column header state.
  - `src/lib/collections.ts` — TanStack DB collection config for `todos` and `todoQueryOptions` used by TanStack Query.
  - `src/lib/queryClient.ts` — TanStack Query client setup.
  - API routes under `src/routes/api/todos/` — lightweight server endpoints consumed by the frontend (`POST`, `PATCH`, `DELETE`, etc.).

- **Backend (Postgres & docs)**
  - See `backend/README.md` for DB setup, Docker Compose, and migrations.

## Features

- **Data fetching** with `@tanstack/svelte-query` and cache updates via optimistic mutations.
- **Headless table** with `@tanstack/table-core` for sorting and column filters (Done/Title).
- **Inline editing** for todo titles with simple validation.
- **UI state persistence** in `localStorage` for sorting, filters and column visibility.

## Getting started (development)

### Prerequisites

- Node.js 20+ and npm
- Docker (optional but recommended if running the included Postgres locally)

### 1) Install dependencies

```sh
npm install
```

### 2) Backend setup

Follow the instructions in `backend/README.md` to:

- Start Postgres via Docker Compose
- Run migrations
- Configure connection environment variables (if needed)

> The frontend includes API routes under `src/routes/api/todos/`. Those endpoints talk to the server‑side data layer which is documented in `backend/README.md`.

### 3) Run the app in dev mode

```sh
npm run dev
```

This starts the SvelteKit dev server. Visit the printed URL (usually `http://localhost:5173`).

## Useful scripts

- `npm run dev` — start the dev server
- `npm run check` — run Svelte type‑checking (`svelte-check`)
- `npm run lint` — run Prettier (check) and ESLint
- `npm run format` — format using Prettier
- `npm run build` — build the production app
- `npm run preview` — preview the production build

## Deployment

SvelteKit supports multiple platforms via adapters. See the official [adapters guide](https://svelte.dev/docs/kit/adapters). Choose the adapter that matches your hosting provider and set any required environment variables (e.g. database URL) in your deployment platform’s settings.

## License

This project is licensed under the MIT License — see `LICENSE`.
