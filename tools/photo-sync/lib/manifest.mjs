import fs from 'node:fs';
import path from 'node:path';

function titleFromFilename(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  } catch {
    return null;
  }
}

export function itemToPhoto(item) {
  const filename = String(item.filename || '').replace(/\.[^.]+$/, '.jpg');
  const date = formatDate(item.createTime);
  const camera = [item.cameraMake, item.cameraModel].filter(Boolean).join(' ');
  const caption =
    item.description ||
    [titleFromFilename(filename), date].filter(Boolean).join(' · ') ||
    titleFromFilename(filename);

  return {
    src: `images/photos/${filename}`,
    caption,
    alt: caption,
    ...(date ? { date } : {}),
    ...(camera ? { camera } : {}),
    ...(item.id ? { googleId: item.id } : {}),
  };
}

export function writePhotosJson(root, photos, source = 'google-photos-picker') {
  const outPath = path.join(root, 'data', 'photos.json');
  const payload = {
    updated: new Date().toISOString(),
    source,
    photos,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

export function readManifest(root) {
  const outPath = path.join(root, 'data', 'photos.json');
  if (!fs.existsSync(outPath)) return { photos: [] };
  return JSON.parse(fs.readFileSync(outPath, 'utf8'));
}
