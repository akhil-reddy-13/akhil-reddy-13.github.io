#!/usr/bin/env node
/**
 * Add photos to the gallery in one step.
 *
 *   npm run photos:add                         # everything in photos-inbox/
 *   npm run photos:add -- ~/Desktop/IMG_5012.HEIC "Dish at golden hour"
 *   npm run photos:add -- ~/Downloads/trip/    # a whole folder
 *   npm run photos:add -- pic.png --date "Oct 2026"   # no EXIF? set the month
 *
 * For each photo it:
 *   - converts HEIC/PNG/etc. to a web JPEG (1600px max edge, ~300 KB)
 *   - strips EXIF/GPS so your location never ships with the image
 *   - reads the date it was taken ("Oct 2026")
 *   - takes the caption from: the CLI arg → a prompt → the filename (if it isn't IMG_1234)
 *   - slots it into data/photos.json newest-first
 *
 * Files in photos-inbox/ are deleted after they're added; files passed by
 * path are left where they are.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import exifr from 'exifr';
import { banner, fail, info, ok, step } from './lib/ui.mjs';
import { readManifest, writePhotosJson } from './lib/manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PHOTOS_DIR = path.join(ROOT, 'images', 'photos');
const INBOX = path.join(ROOT, 'photos-inbox');
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff', '.avif']);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isImage = (f) => EXTS.has(path.extname(f).toLowerCase()) && !path.basename(f).startsWith('.');

function collect(inputs) {
  const files = [];
  for (const input of inputs) {
    const abs = path.resolve(input.replace(/^~(?=$|\/)/, os.homedir()));
    if (!fs.existsSync(abs)) {
      fail(`Not found: ${input}`);
      continue;
    }
    if (fs.statSync(abs).isDirectory()) {
      fs.readdirSync(abs).filter(isImage).sort().forEach((f) => files.push(path.join(abs, f)));
    } else if (isImage(abs)) {
      files.push(abs);
    }
  }
  return files;
}

// Camera/phone default names: IMG_1234, _DSF0301 (Fuji), DSC_0042, PXL_2026…, GOPR0001, Screenshot…
const CAMERA_NAME = /^[_\s-]*(img|pxl|dsc|dscn|dscf|dsf|mvimg|gopr|gx|photo|image|screenshot)?[\s_-]*\d[\w\-\s().]*$/i;

/**
 * "IMG_5012 (1).HEIC" → "img-5012"; "_DSF0301.jpg" → "dsf-0301"; "Golden hour.jpg" → "golden-hour".
 * Never starts with "_" or ".": GitHub Pages (Jekyll) silently skips those files.
 */
function slugFor(file) {
  const base = path.basename(file, path.extname(file));
  const m = base.match(/^[_\s-]*([a-z]+)[_-]?(\d+)/i);
  if (m && CAMERA_NAME.test(base)) return `${m[1].toLowerCase()}-${m[2]}`;
  const slug = base.toLowerCase().normalize('NFKD').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'photo';
}

/** Filename as a caption, unless it's a camera default. */
function captionFromName(file) {
  const base = path.basename(file, path.extname(file)).trim();
  if (CAMERA_NAME.test(base)) return '';
  return base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueName(slug) {
  let name = `${slug}.jpg`;
  for (let n = 2; fs.existsSync(path.join(PHOTOS_DIR, name)); n++) name = `${slug}-${n}.jpg`;
  return name;
}

/** sharp's prebuilt binaries can't decode HEIC, so hand those to the OS first. */
function toDecodable(file, tmpDir) {
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.heic' && ext !== '.heif') return file;
  const out = path.join(tmpDir, `${path.basename(file, ext)}.jpg`);
  try {
    if (process.platform === 'darwin') {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '95', file, '--out', out], { stdio: 'ignore' });
    } else {
      execFileSync('heif-convert', ['-q', '95', file, out], { stdio: 'ignore' });
    }
  } catch {
    throw new Error('could not convert HEIC (on Linux, install libheif-examples)');
  }
  return out;
}

async function takenAt(file) {
  try {
    const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
    const d = exif?.DateTimeOriginal || exif?.CreateDate;
    if (d instanceof Date && !Number.isNaN(d.valueOf())) return d;
  } catch {
    /* no EXIF */
  }
  return fs.statSync(file).mtime;
}

/** "Mar 2026" → sortable number; unknown → 0 */
function dateKey(label) {
  const m = String(label || '').match(/([A-Za-z]{3})\w*\s+(\d{4})/);
  if (!m) return 0;
  const mi = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
  return Number(m[2]) * 12 + Math.max(mi, 0);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
    return;
  }

  banner();

  // --date "Oct 2026" overrides the EXIF date (handy for screenshots / exports)
  let dateOverride = '';
  const di = argv.indexOf('--date');
  if (di !== -1) {
    dateOverride = (argv.splice(di, 2)[1] || '').trim();
    if (!dateKey(dateOverride)) {
      fail(`--date should look like "Oct 2026", got "${dateOverride}"`);
      process.exit(1);
    }
  }

  // A trailing arg that isn't a path is the caption: `photos:add pic.heic "Caption"`
  let cliCaption = '';
  if (argv.length >= 2 && !fs.existsSync(path.resolve(argv.at(-1).replace(/^~/, os.homedir())))) {
    cliCaption = argv.pop();
  }

  const fromInbox = argv.length === 0 || (argv.length === 1 && path.resolve(argv[0]) === INBOX);
  fs.mkdirSync(INBOX, { recursive: true });
  const files = collect(fromInbox ? [INBOX] : argv);
  if (!files.length) {
    info(fromInbox ? 'photos-inbox/ is empty. Drop photos there (or pass paths) and rerun.' : 'No images found.');
    return;
  }

  const interactive = process.stdin.isTTY && process.stdout.isTTY && !process.env.CI;
  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photos-'));
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  const manifest = readManifest(ROOT);
  const photos = manifest.photos || [];
  const added = [];

  try {
    for (const [i, file] of files.entries()) {
      step(i + 1, files.length, path.basename(file));
      try {
        const when = await takenAt(file);
        const date = dateOverride || `${MONTHS[when.getMonth()]} ${when.getFullYear()}`;
        const name = uniqueName(slugFor(file));
        const dest = path.join(PHOTOS_DIR, name);

        // .rotate() bakes in EXIF orientation; sharp drops all metadata (incl. GPS) on output.
        const info2 = await sharp(toDecodable(file, tmpDir), { failOn: 'none' })
          .rotate()
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82, progressive: true, mozjpeg: true })
          .toFile(dest);

        let caption = files.length === 1 && cliCaption ? cliCaption : captionFromName(file);
        if (rl) {
          const answer = (await rl.question(`  caption${caption ? ` [${caption}]` : ''} (${date}): `)).trim();
          if (answer) caption = answer;
        }

        const entry = {
          src: `images/photos/${name}`,
          ...(caption ? { caption } : {}),
          alt: caption || `Photo from ${date}`,
          date,
          w: info2.width,
          h: info2.height,
        };

        // Newest first: insert before the first photo that's older.
        const key = dateKey(date);
        const at = photos.findIndex((p) => dateKey(p.date) <= key);
        photos.splice(at === -1 ? photos.length : at, 0, entry);
        added.push({ entry, file });
        ok(`${name}  ${Math.round(fs.statSync(dest).size / 1024)} KB · ${date}${caption ? ` · “${caption}”` : ''}`);
      } catch (e) {
        fail(`${path.basename(file)}: ${e.message}`);
      }
    }
  } finally {
    rl?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  if (!added.length) process.exit(1);
  writePhotosJson(ROOT, photos, 'manual');

  if (fromInbox) added.forEach(({ file }) => fs.rmSync(file, { force: true }));

  console.log('');
  ok(`Added ${added.length} photo(s). Preview: python3 -m http.server 8080 → http://localhost:8080/#photos`);
  info('Ship it: git add images/photos data/photos.json && git commit -m "Add photos" && git push');
}

main().catch((e) => {
  fail(e.stack || e.message);
  process.exit(1);
});
