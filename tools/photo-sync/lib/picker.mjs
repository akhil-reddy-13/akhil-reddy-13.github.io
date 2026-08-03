import { openBrowser } from './oauth.mjs';
import { info, ok, step, warn } from './ui.mjs';

const API = 'https://photospicker.googleapis.com/v1';

async function api(accessToken, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return data;
}

function parseDurationSeconds(value) {
  if (!value) return 2;
  const m = String(value).match(/^([\d.]+)s$/);
  return m ? Math.max(1, Number(m[1])) : 2;
}

/**
 * Create a picker session, open Google Photos, poll until user finishes.
 * Returns { sessionId, mediaItems }
 */
export async function runPicker(accessToken, { maxItems = 12 } = {}) {
  step(2, 5, 'Creating Google Photos Picker session…');
  const session = await api(accessToken, 'POST', '/sessions', {
    pickingConfig: { maxItemCount: String(maxItems) },
  });

  const sessionId = session.id;
  const pickerUri = `${session.pickerUri}/autoclose`;
  ok(`Session ${sessionId.slice(0, 12)}…`);
  info('Opening Google Photos — pick your favorites, then Done.');
  info(pickerUri);
  openBrowser(pickerUri);

  const pollInterval = parseDurationSeconds(session.pollingConfig?.pollInterval);
  const timeoutMs = parseDurationSeconds(session.pollingConfig?.timeoutIn || '600s') * 1000;
  const started = Date.now();

  step(3, 5, 'Waiting for your selection…');
  let ready = false;
  while (!ready) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Timed out waiting for photo selection');
    }
    await new Promise((r) => setTimeout(r, pollInterval * 1000));
    const status = await api(accessToken, 'GET', `/sessions/${encodeURIComponent(sessionId)}`);
    if (status.mediaItemsSet) {
      ready = true;
      break;
    }
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  ok('Selection received');

  const mediaItems = [];
  let pageToken;
  do {
    const q = new URLSearchParams({ sessionId, pageSize: '100' });
    if (pageToken) q.set('pageToken', pageToken);
    const page = await api(accessToken, 'GET', `/mediaItems?${q}`);
    mediaItems.push(...(page.mediaItems || []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  if (!mediaItems.length) {
    warn('No media items returned — did you pick any photos?');
  } else {
    ok(`Picked ${mediaItems.length} item(s)`);
  }

  try {
    await api(accessToken, 'DELETE', `/sessions/${encodeURIComponent(sessionId)}`);
  } catch {
    /* session cleanup best-effort */
  }

  return { sessionId, mediaItems };
}
