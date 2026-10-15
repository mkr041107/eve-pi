# GitHub Pages deployment

This app is a **static export** (no server). Auth uses **EVE SSO + PKCE** in the browser; colony cache and manual stock timers use **localStorage**.

## One-time setup

### 1. EVE developer application

1. Create an application at [developers.eveonline.com](https://developers.eveonline.com/).
2. Use a **public / mobile** style app with **PKCE** (no client secret in the browser).
3. Scope: `esi-planets.manage_planets.v1`.
4. Callback URL (replace `USER` and `REPO`):

   `https://USER.github.io/REPO/auth/callback/`

   Example for repo `mkrus/eve-pi`:

   `https://mkrus.github.io/eve-pi/auth/callback/`

### 2. GitHub repository

1. Push this project to GitHub.
2. **Settings → Secrets and variables → Actions** → New repository secret:
   - `EVE_CLIENT_ID` — your SSO client ID (not the secret).
3. **Settings → Pages** → Build and deployment:
   - Source: **GitHub Actions**.

### 3. Deploy

Push to `main` (or run the **Deploy to GitHub Pages** workflow). Site URL:

`https://<user>.github.io/<repo>/`

## Local development (matches Pages)

```bash
cp .env.example .env.local
```

Set in `.env.local`:

```env
NEXT_PUBLIC_EVE_CLIENT_ID=your-client-id
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Register callback `http://localhost:3000/auth/callback/` in the dev portal (trailing slash matches Next `trailingSlash: true`).

```bash
npm run sync:sde
npm run dev
```

## Test Pages build locally

```powershell
$env:NEXT_PUBLIC_EVE_CLIENT_ID="your-id"
$env:NEXT_PUBLIC_BASE_PATH="/eve-pi"
$env:NEXT_PUBLIC_APP_URL="https://you.github.io"
npm run sync:sde
npm run build
npx serve out
```

## Notes

- **No Postgres** on GitHub Pages; optional server stack in `src/db` is unused for Pages.
- Clear site data / log out removes tokens and cached colonies from this browser.
- SDE `bundle.json` is built in CI and served from `/data/sde/bundle.json`.
