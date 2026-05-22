#!/usr/bin/env python3
"""One-time OAuth to get a refresh token using your Musona Spotify app credentials."""

import json
import os
import sys
from base64 import b64encode
from pathlib import Path
from urllib.parse import urlencode

MUSONA_ENV = Path(os.environ.get("MUSONA_ENV", Path.home() / "Musona" / ".env"))
PORTFOLIO_ENV = Path(__file__).resolve().parent.parent / ".env"
# Spotify rejects localhost / https://localhost — must use loopback IP (see Spotify redirect URI docs)
REDIRECT_URI = "http://127.0.0.1:8765/callback"
SCOPES = " ".join([
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-read-recently-played",
    "user-read-email",
    "user-read-private",
])


def load_env(path: Path) -> dict[str, str]:
    out = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def main():
    env = {**load_env(MUSONA_ENV), **load_env(PORTFOLIO_ENV)}
    client_id = env.get("SPOTIFY_CLIENT_ID")
    client_secret = env.get("SPOTIFY_CLIENT_SECRET")

    if not client_id or not client_secret:
        print(f"Set SPOTIFY_CLIENT_ID/SECRET in {MUSONA_ENV}", file=sys.stderr)
        sys.exit(1)

    if len(sys.argv) < 2:
        params = urlencode({
            "client_id": client_id,
            "response_type": "code",
            "scope": SCOPES,
            "redirect_uri": REDIRECT_URI,
        })
        print("1. In Spotify Dashboard → your Musona app → Settings → Redirect URIs, add:")
        print(f"   {REDIRECT_URI}")
        print("2. Open this URL, approve, copy the ?code=... from the redirect:\n")
        print(f"https://accounts.spotify.com/authorize?{params}\n")
        print("3. Run: python3 scripts/get_refresh_token.py YOUR_CODE")
        sys.exit(0)

    code = sys.argv[1]
    creds = b64encode(f"{client_id}:{client_secret}".encode()).decode()
    body = urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }).encode()

    import urllib.request
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=body,
        headers={
            "Authorization": f"Basic {creds}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())

    refresh = data.get("refresh_token")
    if not refresh:
        print("No refresh_token in response:", data, file=sys.stderr)
        sys.exit(1)

    lines = []
    if PORTFOLIO_ENV.exists():
        for line in PORTFOLIO_ENV.read_text().splitlines():
            if line.startswith("SPOTIFY_REFRESH_TOKEN="):
                continue
            lines.append(line)
    else:
        lines = [
            "# Portfolio-only — uses same Spotify app as Musona",
            f"SPOTIFY_CLIENT_ID={client_id}",
            f"SPOTIFY_CLIENT_SECRET={client_secret}",
            "SPOTIFY_PROFILE_URL=https://open.spotify.com/user/lkuv124pttnovhci7n5od7cj9",
        ]
    lines.append(f"SPOTIFY_REFRESH_TOKEN={refresh}")
    PORTFOLIO_ENV.write_text("\n".join(lines) + "\n")
    print(f"Wrote refresh token to {PORTFOLIO_ENV} (gitignored)")
    print("Run: ./scripts/sync_spotify.sh")


if __name__ == "__main__":
    main()
