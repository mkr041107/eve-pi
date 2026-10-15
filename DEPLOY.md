# Deployment (hosted)

## Checklist

1. **Postgres** — Neon, Supabase, or Railway; set `DATABASE_URL` on the host.
2. **Migrations** — Run `drizzle/0000_init.sql` against the database (or `npm run db:push` from a machine with env vars).
3. **EVE SSO** — Add production callback `https://<your-domain>/api/auth/callback` in the developer portal.
4. **Environment variables** (production):
   - `DATABASE_URL`
   - `EVE_CLIENT_ID`, `EVE_CLIENT_SECRET`
   - `EVE_CALLBACK_URL` (production callback)
   - `APP_URL` (e.g. `https://<your-domain>`)
   - `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY` (32+ random bytes each)
   - `ESI_USER_AGENT` with real contact email and repo URL
5. **Build** — `npm run build` runs `sync:sde` then `next build`. Ensure outbound HTTPS to `developers.eveonline.com` and `esi.evetech.net`.
6. **Smoke test** — Log in, refresh colonies (open colonies in the EVE client first), verify forecast and manual stock timer.

## Vercel / similar

- Set all env vars for Production and Preview as needed.
- Use Node.js 20+.
- No edge runtime for API routes (Postgres + token encryption use Node APIs).

## Notes

- ESI colony layout is stale until each colony is opened in the EVE client; the UI shows a banner explaining this.
- Respect ESI caching (`Expires`, `ETag`); the app stores colony payloads and ETags in Postgres.
