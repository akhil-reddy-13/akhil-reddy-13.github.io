import fs from 'node:fs';
import path from 'node:path';

export function writePhotosJson(root, photos, source = 'manual') {
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
