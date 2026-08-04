# Photos gallery

Static photolog from `images/photos/` + `data/photos.json`.

## Add photos manually

1. Drop JPEGs into `images/photos/`
2. Run:

```bash
npm install
npm run photos:optimize
```

That recompresses images and refreshes `data/photos.json` (keeps any captions/dates you already set).

3. Optionally edit captions/dates in `data/photos.json`:

```json
{
  "src": "images/photos/lake-lag.jpg",
  "caption": "Lake Lagunita",
  "alt": "Sunset over Lake Lagunita",
  "date": "May 2026",
  "w": 1600,
  "h": 1067
}
```

4. Preview: `python3 -m http.server 8080` → http://localhost:8080/#photos  
5. Commit + push.

```bash
npm run photos:validate
```

## GitHub Action

Workflow **Photos** validates `photos.json` on PRs/pushes that touch the gallery, and can optimize on manual dispatch.
