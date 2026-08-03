# Photos gallery — Google Photos Picker sync

Your site serves a **static** gallery from `images/photos/` + `data/photos.json`.
Google no longer allows apps to silently read your whole library, so sync uses the
official **[Photos Picker API](https://developers.google.com/photos/picker/guides/get-started-picker)**:
you pick photos in Google’s UI; this tool downloads and optimizes them for the site.

## One-time Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. Enable **Google Photos Picker API**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Desktop app**
   - Name: `photo-sync` (or anything)
4. Copy Client ID + Client Secret into `.env` at the repo root:

```bash
GOOGLE_PHOTOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_PHOTOS_CLIENT_SECRET=xxxxx
```

5. Under **OAuth consent screen**, add yourself as a test user if the app is in Testing.

`.env` and `.photos-token.json` are gitignored.

## Sync favorites onto the site

```bash
npm install
npm run photos:sync
```

What happens:

1. Browser opens → Google sign-in (first time)  
2. Google Photos Picker opens → select photos → Done  
3. Images download into `images/photos/`  
4. `sharp` re-encodes them for the web  
5. `data/photos.json` is rewritten  

Options:

```bash
npm run photos:sync -- --max 8      # pick at most 8
npm run photos:sync -- --append    # add to gallery instead of replace
npm run photos:optimize            # recompress existing files only
npm run photos:validate            # CI / local sanity check
```

Preview: `python3 -m http.server 8080` → http://localhost:8080/#photos  
Then commit + push.

## GitHub Action

Workflow **Photos** (`.github/workflows/photos.yml`):

- On every PR/push that touches the gallery → **validates** `photos.json` and files exist  
- Manual **Run workflow** with Optimize → recompresses and commits  

The interactive Picker **must** run on your machine (needs a browser). CI only validates/optimizes.

## Captions

Edit `data/photos.json` after sync:

```json
{
  "src": "images/photos/lake-lag-sunset.jpg",
  "caption": "Lake Lagunita sunset",
  "alt": "Sunset over Lake Lagunita",
  "date": "May 2026"
}
```

## Standalone later

`tools/photo-sync/` is intentionally isolated (OAuth, Picker, download, optimize, manifest).
It can become its own npm package / small Electron or web app later without rewriting the core.
