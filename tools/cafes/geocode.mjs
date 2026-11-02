#!/usr/bin/env node
/**
 * Fill in lat/lng for any cafe in data/cafes.json that has an address but no
 * coordinates (or pass --all to re-check every one). Uses OpenStreetMap's
 * Nominatim, one request per second per their usage policy.
 *
 *   npm run cafes:geocode
 *   npm run cafes:geocode -- --all
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(ROOT, 'data', 'cafes.json');
const all = process.argv.includes('--all');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'akhil-reddy-13.github.io cafe geocoder' } });
  const [hit] = res.ok ? await res.json() : [];
  return hit;
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let changed = 0;

for (const cafe of data.cafes || []) {
  if (!cafe.id) cafe.id = cafe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!cafe.address || (!all && cafe.lat != null && cafe.lng != null)) continue;
  // Try the full address, then fall back to street level if OSM lacks the house number.
  let hit = await lookup(cafe.address);
  if (!hit && /^\d+\s/.test(cafe.address)) {
    await sleep(1100);
    hit = await lookup(cafe.address.replace(/^\d+\s+/, ''));
    if (hit) console.log(`  (${cafe.name}: house number not in OSM, using street-level location)`);
  }
  if (hit) {
    cafe.lat = Math.round(Number(hit.lat) * 1e4) / 1e4;
    cafe.lng = Math.round(Number(hit.lon) * 1e4) / 1e4;
    changed++;
    console.log(`✓ ${cafe.name}: ${cafe.lat}, ${cafe.lng}`);
  } else {
    console.log(`✗ ${cafe.name}: no match for "${cafe.address}" (set lat/lng by hand)`);
  }
  await sleep(1100);
}

if (changed) {
  data.updated = new Date().toISOString().slice(0, 10);
  const json = JSON.stringify(data, null, 2).replace(/\[\s+("[^"\n]*"(?:,\s+"[^"\n]*")*)\s+\]/g, (_, xs) => `[${xs.replace(/,\s+/g, ', ')}]`);
  fs.writeFileSync(FILE, json + '\n');
}
console.log(changed ? `Updated ${changed} cafe(s).` : 'Every cafe already has coordinates.');
