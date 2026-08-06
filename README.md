# Herrera Finance

Herrera Finance is a React and Express finance operations application with Firebase, PostgreSQL, and Vercel integrations.

## Run locally

Prerequisite: Node.js.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure the required values.
3. Start the development server with `npm run dev`.
4. Verify changes with `npm run lint` and `npm run build`.

## Repository layout

```text
api/                    Vercel serverless entry point
assets/                 Static source assets
functions/              Firebase Cloud Functions package
scripts/
  codemods/             Historical, one-off source migration utilities
  database/             Explicit database maintenance utilities
src/
  components/           Shared cross-feature UI components
  data/                 Application data access and local data model
  db/                   PostgreSQL connection and schema
  features/             UI grouped by business domain
  lib/                  Shared services and helpers
  middleware/           Server middleware
server.ts               Express application entry point
```

Feature code belongs in the matching folder under `src/features`. Reusable UI belongs in `src/components`; shared non-UI logic belongs in `src/lib`.

## Maintenance commands

- `npm run remove-seed-cash-accounts` removes known seeded cash accounts after the database environment variables are configured.
- Files under `scripts/codemods` are retained for history and are not part of normal setup or deployment. Review a codemod before running it because these utilities directly rewrite source files.
- Database clearing utilities under `scripts/database` are destructive and must only be run intentionally against a verified Firebase project.
