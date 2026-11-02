# Updating the site

```bash
npm install   # once
```

## Photos

Drop photos into `photos-inbox/` → `npm run photos:add`. Full guide: **[docs/PHOTOS.md](docs/PHOTOS.md)**.

## Cafes

Edit **`data/cafes.json`**. A new cafe only needs this much:

```json
{ "name": "Coupa Café", "emoji": "☕", "score": 8.8, "note": "Iced mocha", "tags": ["Coffee Shop"], "address": "538 Ramona St, Palo Alto, CA 94301" }
```

Then `npm run cafes:geocode` fills in `id`, `lat` and `lng` from the address. Cafes sort by score; the number on each map pin is its rank.

## Music

Put a Spotify playlist, album or track link in **`data/music.config.json`** (`spotify_url`). No API key needed.
