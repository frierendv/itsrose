# ItsRose Dashboard

Customer and administrative web dashboard for the ItsRose platform.

## Stack

- **Next.js 16** (App Router, React 19, React Compiler) with `proxy.ts` route protection
- **HeroUI v3** + Tailwind CSS v4
- **TanStack Query v5** for server state and **TanStack Table v9** for data tables
- **Better Auth** through `@itsrose/auth/react`, with UI surfaces from `@better-auth-ui/heroui`
- **Zustand** (persist) for user web settings

## Structure

```
app/                      Next.js routes; thin wrappers with metadata only
  (auth)/                 Auth pages (better-auth-ui views)
  (dashboard)/            Authenticated app pages
components/               Shared UI primitives (table states, copy button,
                          json view, theme switch, sidebar)
config/                   NEXT_PUBLIC_* runtime configuration
constants/                Route and sidebar constants
features/
  admin/                  Admin pages, components, hooks, query keys
  billing/                Customer billing pages, components, hooks, query keys
  home/                   Dashboard home (subscription snapshot + quick links)
hooks/                    Generic client hooks
layouts/                  App, auth, navbar, and sidebar layouts
lib/                      api glue (withAuthQuery), auth client, query client
providers/                Base providers (theme, progress, toast) and auth/query providers
server/                   Server-only utilities
shared/                   Cross-feature modules (web settings, status props)
styles/                   Global styles and HeroUI theme tokens
types/                    Shared TypeScript types
```

## Environment variables

All public configuration is read through `NEXT_PUBLIC_*`:

| Variable                      | Description                          |
| :---------------------------- | :----------------------------------- |
| `NEXT_PUBLIC_APP_NAME`        | Short product name (sidebar)         |
| `NEXT_PUBLIC_APP_TITLE`       | Full product title (metadata)        |
| `NEXT_PUBLIC_APP_DOMAIN`      | Deployment domain                    |
| `NEXT_PUBLIC_APP_BASE_URL`    | App origin (metadata, auth fallback) |
| `NEXT_PUBLIC_APP_DESCRIPTION` | Product description                  |
| `NEXT_PUBLIC_AUTH_BASE_URL`   | Better Auth server origin            |
| `NEXT_PUBLIC_AUTHOR_GITHUB_*` | Optional author metadata             |

## Development

```bash
pnpm --filter dashboard dev
```

The dashboard expects the Better Auth API to be reachable at `NEXT_PUBLIC_AUTH_BASE_URL` (falls back to the app origin).

## Commands

```bash
pnpm --filter dashboard typecheck   # tsc --noEmit
pnpm --filter dashboard lint        # eslint
pnpm --filter dashboard build       # next build (+ standalone postbuild)
```

## Production

The app builds with `output: "standalone"`. See `Dockerfile` for the
containerized build; run the standalone server with:

```bash
node .next/standalone/apps/dashboard/server.js
```
