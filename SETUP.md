# Music embed

Edit **`data/music.config.json`** with a Spotify share link:

```json
{
  "source": "playlist",
  "spotify_url": "https://open.spotify.com/playlist/YOUR_PLAYLIST_ID",
  "title": "Drake Road Trips",
  "subtitle": "On repeat"
}
```

Works with playlist, album, or track URLs. The site uses Spotify’s official embed iframe — no API keys required.

# Photos

See **[docs/PHOTOS.md](docs/PHOTOS.md)** — sync favorites from Google Photos with:

```bash
npm run photos:sync
```
