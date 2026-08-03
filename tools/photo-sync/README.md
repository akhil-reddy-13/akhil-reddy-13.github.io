# Photo Sync — Google Photos Picker → portfolio gallery

Interactive sync that opens Google Photos Picker, downloads what you pick,
optimizes images, and writes `data/photos.json` for the static site.

```bash
npm run photos:sync
```

Requires `GOOGLE_PHOTOS_CLIENT_ID` and `GOOGLE_PHOTOS_CLIENT_SECRET` in `.env`
(see [docs/PHOTOS.md](../../docs/PHOTOS.md)).
