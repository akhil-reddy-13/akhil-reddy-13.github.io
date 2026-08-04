import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ok, info } from './ui.mjs';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);

/**
 * Re-encode images in-place (or to .jpg) for web: max edge, progressive JPEG.
 */
export async function optimizePhotos(dir, { maxEdge = 1600, quality = 82 } = {}) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
  const out = [];

  for (const file of files) {
    const src = path.join(dir, file);
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    const destName = `${base}.jpg`;
    const dest = path.join(dir, destName);
    const tmp = path.join(dir, `.${base}.tmp.jpg`);

    try {
      const image = sharp(src, { failOn: 'none' }).rotate();
      const meta = await image.metadata();
      await image
        .resize({
          width: maxEdge,
          height: maxEdge,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toFile(tmp);

      fs.renameSync(tmp, dest);
      if (dest !== src && fs.existsSync(src)) fs.unlinkSync(src);

      const outMeta = await sharp(dest, { failOn: 'none' }).metadata();
      const stat = fs.statSync(dest);
      out.push({
        filename: destName,
        width: outMeta.width || meta.width,
        height: outMeta.height || meta.height,
        bytes: stat.size,
      });
      ok(`Optimized ${destName}`);
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      info(`Skip optimize ${file}: ${e.message}`);
      out.push({ filename: file, error: e.message });
    }
  }
  return out;
}

/**
 * Validate photos.json structure and that files exist.
 */
export function validateManifest(root, manifestPath) {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const photos = raw.photos || [];
  const errors = [];
  for (const [i, p] of photos.entries()) {
    if (!p.src) errors.push(`photos[${i}]: missing src`);
    else {
      const abs = path.join(root, p.src);
      if (!fs.existsSync(abs)) errors.push(`photos[${i}]: file missing ${p.src}`);
    }
  }
  return { photos, errors, updated: raw.updated || null };
}
