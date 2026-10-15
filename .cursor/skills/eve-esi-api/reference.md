# esi-docs reference map

Source repository: https://github.com/esi/esi-docs  
Published site: https://developers.eveonline.com/docs/  
Edit path on GitHub: `docs/<file>` (see `edit_uri` in repo `mkdocs.yml`)

## Home and meta

| File | URL |
|------|-----|
| `docs/index.md` | https://developers.eveonline.com/docs/ |
| `docs/support.md` | https://developers.eveonline.com/docs/support/ |
| `docs/contributors.md` | https://developers.eveonline.com/docs/contributors/ |
| `docs/resources/license.md` | https://developers.eveonline.com/docs/resources/license/ |

## Services (`docs/services/`)

### ESI (`docs/services/esi/`)

| File | URL |
|------|-----|
| `overview.md` | https://developers.eveonline.com/docs/services/esi/overview/ |
| `rate-limiting.md` | https://developers.eveonline.com/docs/services/esi/rate-limiting/ |
| `best-practices.md` | https://developers.eveonline.com/docs/services/esi/best-practices/ |
| `endpoints.md` | https://developers.eveonline.com/docs/services/esi/endpoints/ (points to API Explorer) |
| `pagination/cursor-based.md` | https://developers.eveonline.com/docs/services/esi/pagination/cursor-based/ |
| `pagination/x-pages.md` | https://developers.eveonline.com/docs/services/esi/pagination/x-pages/ |
| `pagination/from-id.md` | https://developers.eveonline.com/docs/services/esi/pagination/from-id/ |

### SSO (`docs/services/sso/index.md`)

https://developers.eveonline.com/docs/services/sso/

### Static data (`docs/services/static-data/index.md`)

https://developers.eveonline.com/docs/services/static-data/

### Other services (see `docs/services/*/`)

- `image-server` — character portraits, etc.
- `iec` — EVE Image Compositor
- Additional service index pages are auto-linked from `docs/menu.md` via `services/*/index.md`

## Guides (`docs/guides/`)

| File | URL |
|------|-----|
| `pi.md` | https://developers.eveonline.com/docs/guides/pi/ |
| `staticdata.md` | https://developers.eveonline.com/docs/guides/staticdata/ |
| `route-calculation.md` | https://developers.eveonline.com/docs/guides/route-calculation/ |
| `fitting.md` | https://developers.eveonline.com/docs/guides/fitting/ |
| `glossary.md` | https://developers.eveonline.com/docs/guides/glossary/ |
| `id-ranges.md` | https://developers.eveonline.com/docs/guides/id-ranges/ |
| `system-security.md` | https://developers.eveonline.com/docs/guides/system-security/ |
| `useful-formulae.md` | https://developers.eveonline.com/docs/guides/useful-formulae/ |
| `eve-html.md` | https://developers.eveonline.com/docs/guides/eve-html/ |
| `skinr.md` | https://developers.eveonline.com/docs/guides/skinr/ |
| `map-data/index.md` | https://developers.eveonline.com/docs/guides/map-data/ |

## Snippets (`snippets/`)

Reusable code in esi-docs; referenced from markdown as `--8<-- "snippets/..."`.

Examples:

| Snippet | Topic |
|---------|--------|
| `snippets/sso/authorization-code.*` | SSO auth code flow |
| `snippets/sso/authorization-code-pkce.*` | SSO PKCE |
| `snippets/sso/validate-jwt-token.*` | JWT verification |
| `snippets/formulae/pi-extraction.*` | PI extractor yield curve |
| `snippets/formulae/route-*.py` | Route safety / length examples |

Raw files: `https://raw.githubusercontent.com/esi/esi-docs/main/snippets/<path>`

## External APIs (not in esi-docs repo)

| Resource | URL |
|----------|-----|
| OpenAPI | https://esi.evetech.net/meta/openapi.json |
| SSO metadata | https://login.eveonline.com/.well-known/oauth-authorization-server |
| SDE latest | https://developers.eveonline.com/static-data/tranquility/latest.jsonl |
| Dev blog (limits, changes) | https://developers.eveonline.com/blog/ |

## Local esi-docs development

From repo README: `python3 -m venv .venv`, `pip install -r requirements.txt`, `mkdocs serve` → http://127.0.0.1:8000/docs/
