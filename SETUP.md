# Spotify (reuse Musona app)

Your portfolio uses the **same Spotify Developer app as Musona** — one API key, two projects. No second app needed.

## GitHub Actions secrets

Copy from `~/Musona/.env` into **GitHub → Settings → Secrets → Actions**:

| Secret | Source |
|--------|--------|
| `SPOTIFY_CLIENT_ID` | Musona `.env` |
| `SPOTIFY_CLIENT_SECRET` | Musona `.env` |
| `SPOTIFY_REFRESH_TOKEN` | See below (one-time) |
| `SPOTIFY_PROFILE_URL` | `https://open.spotify.com/user/lkuv124pttnovhci7n5od7cj9` |

## One-time refresh token

Musona stores tokens in your login session. The portfolio needs its own refresh token (same app):

1. Spotify Dashboard → your app → **Redirect URIs**:
   - **Remove** `https://localhost` if you added it (Spotify shows “Insecure”).
   - **Add** `http://127.0.0.1:8765/callback` (not `localhost`).
   - **Keep** Musona’s `http://127.0.0.1:3000/api/auth/callback/spotify`.
   - Click **Save** at the bottom.
2. Run:

```bash
python3 scripts/get_refresh_token.py
# open the URL, sign in, copy ?code= from redirect
python3 scripts/get_refresh_token.py YOUR_CODE
```

3. Sync locally:

```bash
chmod +x scripts/sync_spotify.sh
./scripts/sync_spotify.sh
```

4. Add `SPOTIFY_REFRESH_TOKEN` from `.env` to GitHub secrets, then run **Actions → Update Spotify**.

## Beli

Edit `data/beli.json` manually (no public API).
