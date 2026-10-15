# EVE PI Dashboard

[![Deploy to GitHub Pages](https://github.com/mkr041107/eve-pi/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/mkr041107/eve-pi/actions/workflows/deploy-pages.yml)
[![Live app](https://img.shields.io/website?url=https%3A%2F%2Fmkr041107.github.io%2Feve-pi%2F&label=live%20site)](https://mkr041107.github.io/eve-pi/)

Static Next.js app for EVE Online planetary industry: **EVE SSO (PKCE)**, ESI colony sync, SDE-backed production forecasts, and manual import timers. Runs entirely in the browser on GitHub Pages.

| | |
|---|---|
| **Live app** | **[https://mkr041107.github.io/eve-pi/](https://mkr041107.github.io/eve-pi/)** |
| **Builds** | [GitHub Actions → Deploy to GitHub Pages](https://github.com/mkr041107/eve-pi/actions/workflows/deploy-pages.yml) |
| **Pages settings** | [Repository Pages](https://github.com/mkr041107/eve-pi/settings/pages) |
| **Deploy guide** | [GH-PAGES.md](./GH-PAGES.md) |

[Open live app →](https://mkr041107.github.io/eve-pi/) · [Run / view deploy workflow →](https://github.com/mkr041107/eve-pi/actions/workflows/deploy-pages.yml)

## Features

- Configurable forecast horizon (hours)
- Net **orbit imports** needed to keep factories running
- **Export** volumes to launch pads over the horizon
- **Extractor** time remaining
- **Manual stock** entries with depletion timers (stored in your browser)

## EVE SSO (production)

1. Register an app at [developers.eveonline.com](https://developers.eveonline.com/) with scope `esi-planets.manage_planets.v1` (PKCE — **no client secret** in the static app).
2. Callback URL: `https://mkr041107.github.io/eve-pi/auth/callback/` (trailing slash).
3. GitHub repo secret **`EVE_CLIENT_ID`** → used at build time as `NEXT_PUBLIC_EVE_CLIENT_ID`.
4. Push to `main` or **Actions → Deploy to GitHub Pages → Run workflow** to redeploy after changing the Client ID.

Colony layout in ESI only refreshes after you **open each colony in the EVE client**.

## Local development

1. Copy [`.env.example`](./.env.example) to `.env.local` and set `NEXT_PUBLIC_EVE_CLIENT_ID` (and local callback `http://localhost:3000/auth/callback/` in the dev portal).
2. `npm run install:deps` (or `npm install` on a clean tree).
3. `npm run sync:sde`
4. `npm run dev` → [http://localhost:3000](http://localhost:3000)

### If `npm install` fails on Windows (ENOTEMPTY / EPERM)

Do not repeatedly delete `node_modules` while npm is running. Use:

```powershell
npm run install:deps
```

Close other `next dev` terminals first.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run sync:sde` | Download SDE → `public/data/sde/bundle.json` |
| `npm run build` | SDE sync + static export (`out/`) |
| `npm test` | Unit tests (PI extraction formula) |
| `npm run install:deps` | Safe Windows reinstall (rename + `npm install`) |

## Optional self-hosted stack

Postgres, server-side SSO, and Drizzle files under `src/db/` are legacy from an earlier hosted design and are **not** used on GitHub Pages. See [DEPLOY.md](./DEPLOY.md) if you run your own server.

## License

Third-party EVE Online data via [CCP](https://developers.eveonline.com/docs/resources/license/). This project is not affiliated with CCP.
