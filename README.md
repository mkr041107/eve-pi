# EVE PI Dashboard

Static Next.js app for EVE Online planetary industry: EVE SSO (PKCE), ESI colony sync, SDE-backed production forecasts, and manual import timers.

**Deploy on GitHub Pages:** see [GH-PAGES.md](./GH-PAGES.md).

## Features

- Configurable forecast horizon (hours)
- Net **orbit imports** needed to keep factories running
- **Export** volumes to launch pads over the horizon
- **Extractor** time remaining
- **Manual stock** entries with persisted empty time

## Setup

### If `npm install` fails on Windows (ENOTEMPTY / EPERM)

Overlapping installs or deleting `node_modules` while npm is running leaves locked folders under `node_modules\next`. **Do not** loop `rmdir node_modules` + `npm install`. Use:

```powershell
npm run install:deps
```

That renames the broken folder aside and installs cleanly. Close other terminals running `next dev` first. Exclude `F:\Webapps\eve-pi\node_modules` from real-time antivirus scanning if installs keep failing.

1. Copy `.env.example` to `.env.local` and fill in values.
2. Register an application at [developers.eveonline.com](https://developers.eveonline.com/) with scope `esi-planets.manage_planets.v1` and callback URL(s) matching `EVE_CALLBACK_URL`.
3. Create a Postgres database and set `DATABASE_URL`.
4. Apply schema: `psql $DATABASE_URL -f drizzle/0000_init.sql` (or `npm run db:push` once Drizzle is configured).
5. Install and run SDE sync: `npm install` then `npm run sync:sde`.
6. `npm run dev` → open `http://localhost:3000`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run sync:sde` | Download SDE and build `data/sde/bundle.json` |
| `npm run build` | Sync SDE + production build |
| `npm test` | Unit tests (PI extraction formula) |

See [DEPLOY.md](./DEPLOY.md) for hosted deployment.
