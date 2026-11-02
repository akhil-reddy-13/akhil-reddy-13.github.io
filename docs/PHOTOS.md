# Photos

## Add photos (the easy way)

1. AirDrop / drag your photos (HEIC is fine) into **`photos-inbox/`**.
2. Run:

   ```bash
   npm run photos:add
   ```

   It asks for a caption for each one (press Enter to skip). Then it shrinks the photo for the web, reads the date it was taken, strips GPS and other metadata, slots it in newest-first, and empties the inbox.

3. Preview with `python3 -m http.server 8080` → http://localhost:8080/#photos, then:

   ```bash
   git add images/photos data/photos.json && git commit -m "Add photos" && git push
   ```

**Shortcuts**

- Name the file what you want the caption to be (`Dish at golden hour.HEIC`) and it'll be pre-filled.
- Point it straight at files or a folder: `npm run photos:add -- ~/Downloads/IMG_5012.HEIC "Dish at golden hour"`
- `photos-inbox/` is git-ignored, so raw originals (with GPS) never get committed by accident.

## Edit / reorder / remove

Everything lives in `data/photos.json`; the order there is the order on the site.

- **Caption or date:** edit `caption` / `date` (`"Oct 2026"`).
- **Reorder:** move the entry.
- **Remove:** delete the entry and its file in `images/photos/`.

`npm run photos:validate` checks that every entry points at a real file (the **Photos** GitHub Action runs this on push too).
