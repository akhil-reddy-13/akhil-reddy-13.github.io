#!/usr/bin/env node
/**
 * Manual photo gallery helper.
 *
 * Drop JPGs into images/photos/, then:
 *   npm run photos:optimize   # recompress + refresh data/photos.json (keeps captions/dates)
 *   npm run photos:validate   # check files exist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { banner, fail, info, ok, step } from './lib/ui.mjs';
import { optimizePhotos, validateManifest } from './lib/optimize.mjs';
import { writePhotosJson, readManifest } from './lib/manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PHOTOS_DIR = path.join(ROOT, 'images', 'photos');
const MANIFEST = path.join(ROOT, 'data', 'photos.json');

function parseArgs(argv) {
  const args = { optimizeOnly: false, validateOnly: false };
  for (const a of argv) {
    if (a === '--optimize') args.optimizeOnly = true;
    else if (a === '--validate') args.validateOnly = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

async function buildManifestFromFolder() {
  const prev = readManifest(ROOT).photos || [];
  const byBase = new Map(
    prev.map((p) => [path.basename(p.src || '').replace(/\.[^.]+$/, ''), p])
  );

  const files = fs
    .readdirSync(PHOTOS_DIR)
    .filter((f) => /\.jpe?g$/i.test(f) && !f.startsWith('.'));

  const photos = [];
  for (const filename of files) {
    const base = filename.replace(/\.[^.]+$/, '');
    const old = byBase.get(base) || {};
    const meta = await sharp(path.join(PHOTOS_DIR, filename), { failOn: 'none' }).metadata();
    // Drop auto "Img 1234 · Jan 2026" captions — keep real captions / dates only
    let caption = old.caption || '';
    if (/^img\s+\d+/i.test(caption) || /^img[-_]\d+/i.test(caption)) caption = '';
    const date = old.date || '';
    photos.push({
      src: `images/photos/${filename}`,
      ...(caption ? { caption } : {}),
      alt: old.alt && !/^img\s+\d+/i.test(old.alt) ? old.alt : caption || 'Photo',
      ...(date ? { date } : {}),
      ...(meta.width ? { w: meta.width } : {}),
      ...(meta.height ? { h: meta.height } : {}),
    });
  }

  const byNew = new Map(photos.map((p) => [path.basename(p.src).replace(/\.[^.]+$/, ''), p]));
  const ordered = [];
  const seen = new Set();
  for (const p of prev) {
    const base = path.basename(p.src || '').replace(/\.[^.]+$/, '');
    if (byNew.has(base) && !seen.has(base)) {
      ordered.push(byNew.get(base));
      seen.add(base);
    }
  }
  for (const p of photos) {
    const base = path.basename(p.src).replace(/\.[^.]+$/, '');
    if (!seen.has(base)) ordered.push(p);
  }

  writePhotosJson(ROOT, ordered, 'manual');
  return ordered;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  banner();

  if (args.help || (!args.optimizeOnly && !args.validateOnly)) {
    console.log('Usage:');
    console.log('  npm run photos:optimize');
    console.log('  npm run photos:validate');
    console.log('');
    info('Drop images into images/photos/, optimize, edit captions in data/photos.json, commit.');
    process.exit(args.help ? 0 : 1);
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

  step(1, 2, 'Optimizing images/photos…');
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  await optimizePhotos(PHOTOS_DIR);

  step(2, 2, 'Refreshing data/photos.json…');
  const photos = await buildManifestFromFolder();
  ok(`Gallery ready — ${photos.length} photo(s)`);
}

main().catch((e) => {
  fail(e.stack || e.message);
  process.exit(1);
});
