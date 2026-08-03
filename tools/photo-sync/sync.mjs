#!/usr/bin/env node
/**
 * photo-sync — Google Photos Picker → images/photos + data/photos.json
 *
 * Usage:
 *   node tools/photo-sync/sync.mjs              # interactive picker sync
 *   node tools/photo-sync/sync.mjs --optimize   # optimize existing folder only
 *   node tools/photo-sync/sync.mjs --validate   # validate manifest + files
 *   node tools/photo-sync/sync.mjs --max 8      # cap picker selection
 *   node tools/photo-sync/sync.mjs --append     # add to gallery instead of replace
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { banner, fail, info, ok, step, warn } from './lib/ui.mjs';
import { getAccessToken } from './lib/oauth.mjs';
import { runPicker } from './lib/picker.mjs';
import { downloadPicked } from './lib/download.mjs';
import { optimizePhotos, validateManifest } from './lib/optimize.mjs';
import { itemToPhoto, writePhotosJson, readManifest } from './lib/manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PHOTOS_DIR = path.join(ROOT, 'images', 'photos');
const MANIFEST = path.join(ROOT, 'data', 'photos.json');

function parseArgs(argv) {
  const args = { optimizeOnly: false, validateOnly: false, append: false, max: 12 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--optimize') args.optimizeOnly = true;
    else if (a === '--validate') args.validateOnly = true;
    else if (a === '--append') args.append = true;
    else if (a === '--max') args.max = Number(argv[++i]) || 12;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  banner();

  if (args.help) {
    console.log('Usage: npm run photos:sync [-- --optimize|--validate|--append|--max N]');
    process.exit(0);
  }

  if (args.validateOnly) {
    step(1, 1, 'Validating data/photos.json…');
    const { photos, errors } = validateManifest(ROOT, MANIFEST);
    if (errors.length) {
      errors.forEach((e) => fail(e));
      process.exit(1);
    }
    ok(`${photos.length} photo(s) OK`);
    process.exit(0);
  }

  if (args.optimizeOnly) {
    step(1, 2, 'Optimizing images/photos…');
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    await optimizePhotos(PHOTOS_DIR);

    step(2, 2, 'Refreshing manifest paths…');
    const prev = readManifest(ROOT).photos || [];
    const byBase = new Map(
      prev.map((p) => [path.basename(p.src).replace(/\.[^.]+$/, ''), p])
    );
    const files = fs
      .readdirSync(PHOTOS_DIR)
      .filter((f) => /\.jpe?g$/i.test(f) && !f.startsWith('.'));
    const photos = files.map((filename) => {
      const base = filename.replace(/\.[^.]+$/, '');
      const old = byBase.get(base);
      const caption = old?.caption || base.replace(/-/g, ' ');
      return {
        src: `images/photos/${filename}`,
        caption,
        alt: old?.alt || caption,
        ...(old?.date ? { date: old.date } : {}),
        ...(old?.camera ? { camera: old.camera } : {}),
        ...(old?.googleId ? { googleId: old.googleId } : {}),
      };
    });
    writePhotosJson(ROOT, photos, 'optimize');
    ok(`Optimize complete — ${photos.length} photo(s)`);
    process.exit(0);
  }

  step(1, 5, 'Authenticating with Google…');
  let accessToken;
  try {
    accessToken = await getAccessToken(ROOT);
  } catch (e) {
    fail(e.message);
    info('Create a Google Cloud OAuth client and add credentials to .env — docs/PHOTOS.md');
    process.exit(1);
  }

  let mediaItems;
  try {
    ({ mediaItems } = await runPicker(accessToken, { maxItems: args.max }));
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  if (!mediaItems?.length) {
    warn('Nothing to sync.');
    process.exit(0);
  }

  step(4, 5, 'Downloading + optimizing…');
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  if (!args.append) {
    for (const f of fs.readdirSync(PHOTOS_DIR)) {
      if (f.startsWith('.')) continue;
      fs.unlinkSync(path.join(PHOTOS_DIR, f));
    }
  }

  const downloaded = await downloadPicked(accessToken, mediaItems, PHOTOS_DIR);
  await optimizePhotos(PHOTOS_DIR);

  const optimized = downloaded.map((d) => ({
    ...d,
    filename: d.filename.replace(/\.[^.]+$/, '.jpg'),
  }));

  const fresh = optimized.map(itemToPhoto);
  const photos = args.append
    ? [...(readManifest(ROOT).photos || []), ...fresh]
    : fresh;

  writePhotosJson(ROOT, photos, 'google-photos-picker');

  step(5, 5, 'Done');
  const check = validateManifest(ROOT, MANIFEST);
  if (check.errors.length) check.errors.forEach((e) => warn(e));
  ok(`Gallery ready — ${check.photos.length} photo(s) in data/photos.json`);
  info('Preview locally, then commit & push.');
}

main().catch((e) => {
  fail(e.stack || e.message);
  process.exit(1);
});
