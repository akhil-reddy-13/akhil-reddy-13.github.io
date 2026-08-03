import fs from 'node:fs';
import path from 'node:path';
import { info, ok } from './ui.mjs';

function slugify(name) {
  return String(name || 'photo')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'photo';
}

function extFromMime(mime) {
  if (!mime) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('heic') || mime.includes('heif')) return '.jpg';
  return '.jpg';
}

/**
 * Download picked images into outDir. Returns local file metadata.
 * baseUrl requires OAuth bearer and a size/download suffix.
 */
export async function downloadPicked(accessToken, mediaItems, outDir, { maxEdge = 1920 } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const results = [];
  let i = 0;

  for (const item of mediaItems) {
    i += 1;
    const file = item.mediaFile || {};
    const mime = file.mimeType || item.mimeType || 'image/jpeg';
    if (!String(mime).startsWith('image/')) {
      info(`Skipping non-image: ${file.filename || item.id}`);
      continue;
    }

    const baseUrl = file.baseUrl || item.baseUrl;
    if (!baseUrl) {
      info(`No baseUrl for ${item.id}`);
      continue;
    }

    const url = `${baseUrl}=w${maxEdge}-h${maxEdge}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Download failed for ${item.id}: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const baseName = slugify(file.filename || `photo-${i}`);
    const ext = extFromMime(mime);
    let filename = `${baseName}${ext}`;
    let dest = path.join(outDir, filename);
    let n = 2;
    while (fs.existsSync(dest)) {
      filename = `${baseName}-${n}${ext}`;
      dest = path.join(outDir, filename);
      n += 1;
    }
    fs.writeFileSync(dest, buf);

    const meta = file.mediaFileMetadata || file.metadata || {};
    const photoMeta = meta.photoMetadata || meta;
    results.push({
      id: item.id,
      filename,
      path: dest,
      mimeType: mime,
      createTime: item.createTime || null,
      width: photoMeta.width || meta.width || null,
      height: photoMeta.height || meta.height || null,
      cameraMake: photoMeta.cameraMake || null,
      cameraModel: photoMeta.cameraModel || null,
      description: item.description || file.description || null,
    });
    ok(`Downloaded ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  return results;
}
