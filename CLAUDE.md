# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Resttek: restaurant management platform. npm-workspaces monorepo (`packages/*`) with one Node API and four Angular 21 packages. Docs are in Spanish under `docs/` (`arquitectura/`, `dominio/`); read them before non-trivial changes. Node 22+, npm 10+.

## Commands (run from repo root)

```bash
npm install            # installs every workspace
npm run seed           # populate SQLite (idempotent, INSERT OR IGNORE); prints credentials
npm run dev:api        # API on :3000 (tsx watch); health at /health (no /api/v1 prefix)
npm run dev:admin      # web-admin :4200
npm run dev:empleados  # web-empleados :4201
npm run dev:clientes   # web-clientes :4202
npm test               # Vitest, API package only
```

- Single test: `cd packages/api && npx vitest run src/services/order.service.test.ts` (add `-t "name"` to filter); `npm run test:watch` for watch mode.
- Frontends: `npm run build` / `ng build` inside each package. There is no lint script and no frontend test script.
- `scripts/seed-issues.sh` creates GitHub issues from `scripts/issues.json` (needs `gh` + `jq`; supports `--dry-run`). Unrelated to the app.
- Test logins: password equals the email (e.g. `admin@resttek.com`).
- Restart the frontend dev server after editing `web-shared`; Angular doesn't pick up changes automatically.

## Architecture

Frontends proxy `/api` to `localhost:3000` via each package's `proxy.conf.json`. All frontends depend on `@resttek/web-shared` (auth service/store/guard, interceptors, login/register components, base styles) and not on each other. Auth is JWT (bcrypt passwords); `authenticate` and `authorize(roles)` middlewares in the API, `AuthInterceptor` and `AuthGuard` in the frontend. Roles: admin, manager, camarero, cocinero, cliente.

### API (`packages/api`, Express 5, ESM, SQLite)

Two coexisting styles. Check which one applies before editing:
- **Hexagonal + DDD**, only for `employee`: `src/contexts/employee/{domain,application,infrastructure}`. `Employee` is the only real entity (private constructor + `create()`); one use case class per action with `execute()`; interfaces prefixed `I`. `contexts/shared` holds the `Email` value object, middlewares and `errorHandler`.
- **Layered** for `restaurant`, `dish`, `ingredient`, `order`: `src/{models,repositories,services,controllers,routes}`, one file per domain. Models are plain interfaces plus `normalizeX()` helpers. Repository interface lives in the same file as its SQLite implementation (no `I` prefix). Dependency wiring happens inside each `*.routes.ts` file.

Gotchas:
- Imports use path aliases (`@services/*`, `@employee/*`, `@shared/*`, ...) and must end in `.js`.
- DB is a single `dbConfig` instance (`config/database.ts`). The tables are created at startup via `CREATE TABLE IF NOT EXISTS`. `NODE_ENV=test` uses `:memory:`; otherwise `packages/api/resttek.db`.
- `errorHandler` maps error class names to HTTP status. `OrderController` bypasses it with its own try/catch, so `OrderNotFoundError` gives 404 on GET but 400 on PATCH.
- Creating an order expands `quantity: n` into n `order_items` rows of quantity 1 (per-unit status).
- Order routes have no `authorize()`. `GET /orders/active` requires `?restaurantId=`.
- Routers under `/restaurants/:restaurantId/...` need `Router({ mergeParams: true })`.
- Tests are unit-only, colocated with the code, with mocks in `*/mocks/`. `supertest` is installed but unused, so there are no HTTP tests.

### Frontends (Angular 21, standalone, signals, zoneless, lucide-angular)

Structure differs per app:
- `web-admin`, `web-empleados`: `features/<feature>/{models,pages,services,store}`. Stores are `providedIn: 'root'` services with private signals exposed via `asReadonly()` plus loading/error. They wrap service Observables in `firstValueFrom`, and components talk only to the store. `web-empleados` `OrderStore` polls every 30 s.
- `web-clientes`: models/services/store centralized in `core/`. Only `CartStore` is a store (local, no HTTP). Components subscribe to services directly, and `my-orders` polls every 10 s with `setInterval`. Root component is `App` (not `AppComponent`).
