import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';
import { spawn } from 'node:child_process';
import { info, ok, warn } from './ui.mjs';

const SCOPES = ['https://www.googleapis.com/auth/photospicker.mediaitems.readonly'];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [url], { shell: process.platform === 'win32', detached: true, stdio: 'ignore' }).unref();
}

function loadEnvFile(root) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

export function getCredentials(root) {
  loadEnvFile(root);
  const clientId = process.env.GOOGLE_PHOTOS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_PHOTOS_CLIENT_ID / GOOGLE_PHOTOS_CLIENT_SECRET in .env — see docs/PHOTOS.md'
    );
  }
  return { clientId, clientSecret };
}

function tokenPath(root) {
  return path.join(root, '.photos-token.json');
}

function readStoredToken(root) {
  const p = tokenPath(root);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeStoredToken(root, data) {
  fs.writeFileSync(tokenPath(root), JSON.stringify(data, null, 2) + '\n');
}

async function exchangeCode({ clientId, clientSecret, code, redirectUri }) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function waitForAuthCode(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, `http://127.0.0.1:${port}`);
      if (u.pathname !== '/') {
        res.writeHead(404);
        res.end();
        return;
      }
      const err = u.searchParams.get('error');
      const code = u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (err) {
        res.end(`<html><body style="font-family:system-ui;background:#0a0a0a;color:#fafafa;padding:3rem"><h1>Auth failed</h1><p>${err}</p></body></html>`);
        server.close();
        reject(new Error(err));
        return;
      }
      res.end(`<html><body style="font-family:system-ui;background:#0a0a0a;color:#fafafa;padding:3rem;text-align:center">
        <h1 style="color:#1ed760">Connected</h1>
        <p>You can close this tab and return to the terminal.</p>
      </body></html>`);
      server.close();
      resolve(code);
    });
    server.listen(port, '127.0.0.1');
    server.on('error', reject);
  });
}

async function interactiveLogin(root, creds) {
  const port = 8787;
  const redirectUri = `http://127.0.0.1:${port}/`;
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });
  const authUrl = `${AUTH_URL}?${params}`;
  info('Opening Google sign-in in your browser…');
  info(authUrl);
  const codePromise = waitForAuthCode(port);
  openBrowser(authUrl);
  const code = await codePromise;
  const tokens = await exchangeCode({
    ...creds,
    code,
    redirectUri,
  });
  if (!tokens.refresh_token) {
    warn('No refresh_token returned — you may need to revoke app access and retry.');
  }
  writeStoredToken(root, {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expiry: Date.now() + (tokens.expires_in || 3600) * 1000,
    scope: tokens.scope,
  });
  ok('OAuth complete — token saved to .photos-token.json');
  return tokens.access_token;
}

/**
 * Returns a valid access token, refreshing or prompting login as needed.
 */
export async function getAccessToken(root) {
  const creds = getCredentials(root);
  const stored = readStoredToken(root);

  if (stored?.access_token && stored.expiry && Date.now() < stored.expiry - 60_000) {
    return stored.access_token;
  }

  if (stored?.refresh_token) {
    try {
      const refreshed = await refreshAccessToken({
        ...creds,
        refreshToken: stored.refresh_token,
      });
      writeStoredToken(root, {
        ...stored,
        access_token: refreshed.access_token,
        expiry: Date.now() + (refreshed.expires_in || 3600) * 1000,
      });
      ok('Refreshed Google access token');
      return refreshed.access_token;
    } catch (e) {
      warn(`Refresh failed (${e.message}) — signing in again`);
    }
  }

  return interactiveLogin(root, creds);
}

export { openBrowser };
