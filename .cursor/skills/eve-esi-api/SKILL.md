---
name: eve-esi-api
description: >-
  Builds and debugs EVE Online third-party apps against ESI and SSO using the
  official esi-docs knowledge base. Covers authentication, scopes, OpenAPI route
  lookup, rate limits, caching, pagination, static data (SDE), and domain guides
  (PI, routes, fittings, map data). Use when integrating EVE ESI, esi.evetech.net,
  EVE SSO, planetary interaction APIs, or developers.eveonline.com documentation.
---

# EVE ESI API (esi-docs)

Authoritative human docs: [EVE Developer Documentation](https://developers.eveonline.com/docs/) (built from [esi/esi-docs](https://github.com/esi/esi-docs)).

Machine-readable API contract: `https://esi.evetech.net/meta/openapi.json`  
Interactive explorer: [API Explorer](https://developers.eveonline.com/api-explorer)

When behavior is ambiguous, resolve in this order:

1. OpenAPI (`meta/openapi.json`) for routes, scopes, cache TTL, rate-limit groups
2. Published docs paths in [reference.md](reference.md) (mirror of `docs/` in esi-docs)
3. Raw GitHub: `https://raw.githubusercontent.com/esi/esi-docs/main/docs/<path>`

Report ESI bugs / feature requests: [esi/esi-issues](https://github.com/esi/esi-issues) (not esi-docs).

## Base URLs and versioning

- ESI base: `https://esi.evetech.net/latest/` (or `/dev/` for testing — avoid in production tools)
- Set **`X-Compatibility-Date: YYYY-MM-DD`** (or query `compatibility_date`) on every app implementation; if omitted, oldest behavior applies. API “date” rolls at **11:00 UTC** (use “now minus 11h” for “today’s” API date). See [ESI overview](https://developers.eveonline.com/docs/services/esi/overview/).
- Optional: `Accept-Language`, `Tenant` (where applicable) per OpenAPI.

## SSO (required for most character/corp data)

Docs: [Single Sign-On](https://developers.eveonline.com/docs/services/sso/)

1. Register app at [developers.eveonline.com](https://developers.eveonline.com/) → client ID + secret (or PKCE for public clients).
2. Discover endpoints from `https://login.eveonline.com/.well-known/oauth-authorization-server` (cache reasonably; do not hardcode forever).
3. **Authorization code** (server apps) or **authorization code + PKCE** (desktop/mobile/browser without secret).
4. Exchange code at `token_endpoint`; store **refresh token** securely; refresh before access token expiry.
5. Validate JWT: JWKS from metadata, `iss` (`https://login.eveonline.com/` or `login.eveonline.com`), `aud` includes your `client_id` and `"EVE Online"`, `exp`, `sub` → `CHARACTER:EVE:<character_id>`, scopes in `scp`.

Request only scopes registered on the application and required by the routes you call (OpenAPI `security` / OAuth2 scopes).

## Calling ESI correctly

### User-Agent (required in practice)

Send app identity on every request ([best practices](https://developers.eveonline.com/docs/services/esi/best-practices/)):

| Context | Header / param |
|--------|----------------|
| Server / native | `User-Agent: MyApp/1.0.0 (you@example.com; +https://github.com/org/repo)` |
| Browser | `X-User-Agent` (Chrome blocks `User-Agent` on fetch) |
| No custom headers | `user_agent` query param (URL-encoded) |

Include email or contact, app name/version, and source URL when possible.

### Caching (do not poll early)

- Honor **`Expires` / `Cache-Control`** — polling before expiry wastes quota and can contribute to bans.
- Use **`ETag`** + **`If-None-Match`** for cheap 304s; on paginated lists, compare **`Last-Modified`** across pages in one sync.
- Static universe routes often expire daily ~11:05 UTC (stated per route in OpenAPI description).

### Rate limits

Two systems ([rate limiting](https://developers.eveonline.com/docs/services/esi/rate-limiting/), [best practices](https://developers.eveonline.com/docs/services/esi/best-practices/)):

| System | Signals | Behavior |
|--------|---------|----------|
| **Bucket** (per route group) | `X-Ratelimit-*`, `Retry-After` on 429 | Floating window; cost 2/1/5 tokens for 2xx/3xx/4xx |
| **Error limit** (global) | `X-ESI-Error-Limit-Remain`, `X-ESI-Error-Limit-Reset` | Too many errors → 420 on all routes |

Bucket identity: authenticated → `applicationID:characterID`; public → IP (or IP:app if token sent). Read `x-rate-limit` on each route in OpenAPI.

**Implementation habits:** backoff on 429; stagger periodic jobs (not aligned `*/5` cron); prefer conditional requests; stay well under limits.

### Pagination

- **X-Pages**: `X-Pages` header + `page` query — see [x-pages](https://developers.eveonline.com/docs/services/esi/pagination/x-pages/).
- **From-ID**: incremental ID walks — [from-id](https://developers.eveonline.com/docs/services/esi/pagination/from-id/).
- **Cursor**: opaque `before` / `after` tokens; never decode — [cursor-based](https://developers.eveonline.com/docs/services/esi/pagination/cursor-based/).

## OpenAPI workflow

```bash
# List paths matching a feature (PowerShell example)
$api = Invoke-RestMethod 'https://esi.evetech.net/meta/openapi.json'
$api.paths.PSObject.Properties.Name | Where-Object { $_ -match 'planets' }
```

For each route, read: `summary`, `description`, `parameters`, `security` (scopes), `x-cache-age`, `x-rate-limit`, `x-compatibility-date`.

Schemas live under `components.schemas` (response shapes, enums).

## Static Data Export (SDE)

Game data that changes only on patches — not live character state. See [static data service](https://developers.eveonline.com/docs/services/static-data/) and [using static data](https://developers.eveonline.com/docs/guides/staticdata/).

- Latest manifests: `https://developers.eveonline.com/static-data/tranquility/latest.jsonl`
- Zip pattern: `eve-online-static-data-<build>-<jsonl|yaml>.zip`
- Prefer **JSON Lines** for large files (`mapMoons`, etc.).

Use SDE for types, dogma, map topology, typelists; use ESI for character/corp/market live data.

## Domain guides (esi-docs `docs/guides/`)

| Topic | Doc |
|-------|-----|
| Planetary Industry (extraction math) | [pi.md](https://developers.eveonline.com/docs/guides/pi/) — see [pi-reference.md](pi-reference.md) |
| Routes / pathfinding | [route-calculation.md](https://developers.eveonline.com/docs/guides/route-calculation/) |
| Map data | [map-data](https://developers.eveonline.com/docs/guides/map-data/) |
| System security | [system-security.md](https://developers.eveonline.com/docs/guides/system-security/) |
| ID ranges | [id-ranges.md](https://developers.eveonline.com/docs/guides/id-ranges/) |
| Fitting | [fitting.md](https://developers.eveonline.com/docs/guides/fitting/) |
| Glossary | [glossary.md](https://developers.eveonline.com/docs/guides/glossary/) |
| Formulae | [useful-formulae.md](https://developers.eveonline.com/docs/guides/useful-formulae/) |

Code snippets for docs live in esi-docs `snippets/` (included in guides via MkDocs snippets).

## Planetary Interaction (eve-pi)

Primary authenticated routes (scope **`esi-planets.manage_planets.v1`**):

| Method | Path | Notes |
|--------|------|--------|
| GET | `/characters/{character_id}/planets` | Colony list |
| GET | `/characters/{character_id}/planets/{planet_id}` | Full layout (pins, links, routes). **Stale until colony opened in game client** (OpenAPI description) |
| GET | `/universe/planets/{planet_id}` | Public planet info; daily expiry ~11:05 |

Related: `/corporations/{corporation_id}/customs_offices` (corp PI tax structures — separate scope in OpenAPI).

Extractor yield from ESI pin fields requires the decay/noise calculation in the PI guide — do not treat raw `qty_per_cycle` as final output. Details: [pi-reference.md](pi-reference.md).

## Checklist for new ESI features

```
- [ ] Scope(s) registered on dev portal and requested at login
- [ ] User-Agent / X-User-Agent set
- [ ] X-Compatibility-Date set intentionally
- [ ] Cache headers respected; ETag / If-None-Match used
- [ ] Rate limit + error limit headers logged in dev
- [ ] Pagination pattern matches route (pages / from-id / cursor)
- [ ] Character ID in path matches token sub claim
```

## Additional resources

- Full doc tree map: [reference.md](reference.md)
- PI extraction implementation notes: [pi-reference.md](pi-reference.md)
