# Music showcase

Pick what shows on your site in **`data/music.config.json`**, then sync.

## Configure (`data/music.config.json`)

**All-time favorites** (default):

```json
{
  "source": "top_tracks",
  "title": "All-time favorites",
  "subtitle": "From my Spotify"
}
```

**A playlist, album, or single track** — copy the link from Spotify:

```json
{
  "source": "playlist",
  "spotify_url": "https://open.spotify.com/playlist/YOUR_PLAYLIST_ID",
  "title": "Spring '26",
  "subtitle": "On repeat"
}
```

Use `"source": "album"` or `"source": "track"` with the matching URL.

## Sync locally

```bash
./scripts/sync_spotify.sh
```

## GitHub

Uses the same secrets as before (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`). Workflow **Update Music** runs weekly and updates `data/music.json`.

## Play button

Click **play** on the card to open Spotify’s embed and listen in-page (playlist/album/track you configured).
