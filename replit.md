# Neo-Zombie Protocol

Neo-Zombie Protocol is a neon cyberpunk 1v4 survival game: survivors repair generators and escape while a killer hunts the cell.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/neo-zombie-protocol run dev` — run the playable web client
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/neo-zombie-protocol/src/App.tsx` — mounts the playable p5 game runtime
- `artifacts/neo-zombie-protocol/public/sketch.js` — arena gameplay, movement, combat, waves, pickups, menus, shop, inventory, settings, and audio state
- `artifacts/neo-zombie-protocol/public/loading-*.png` — loading/death scene art used by the runtime
- `artifacts/neo-zombie-protocol/public/*.mp3` — menu, run, shop, and death music
- `artifacts/api-server/src/routes/game.ts` — in-memory game sessions and leaderboard endpoints
- `lib/api-spec/openapi.yaml` — source of truth for health, session, and leaderboard contracts
- `artifacts/neo-zombie-protocol/src/index.css` — neon command-deck visual language

## Architecture decisions

- The playable client is a root web artifact and loads the supplied global-mode p5 runtime after React mounts so the canvas starts reliably in the proxied preview.
- The active playable loop is an arena survival run: movement, shooting, melee, dash, abilities, waves, hostile variants, damage, pickups, upgrades, and death/retry all happen in the canvas rather than separate mock screens.
- The shared Express API remains available under `/api` for the session/leaderboard layer and future multiplayer persistence.

## Product

- Playable neon arena run with a field brief and keyboard/mouse controls
- Survivor-style operative movement against standard, fast, and tank infected
- Wave progression, scoring, Crystalis pickups, shield damage, regeneration, particles, camera shake, and death/retry
- Operative select, shop, inventory, equipment, upgrade tiers, synergies, settings, key rebinding, fullscreen, and music controls
- Loading/death scenes and bundled menu, run, shop, and death audio

## User preferences

- Preserve the neon cyberpunk identity and prioritize a playable run over a collection of disconnected screens.

## Gotchas

- The Vite artifact build requires workflow-provided `PORT` and `BASE_PATH`; use the artifact workflow for normal runs.
- The p5 and p5.sound scripts must load before `src/main.tsx`; `App.tsx` explicitly creates one guarded p5 instance.
- Re-run API codegen after changing `lib/api-spec/openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
