#!/usr/bin/env python3
"""Build data/music.json from music.config.json (playlist, album, or top tracks)."""

import json
import os
import re
import sys
from base64 import b64encode
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

import ssl
from urllib.request import Request, urlopen

try:
    import certifi

    def _urlopen(req):
        ctx = ssl.create_default_context(cafile=certifi.where())
        return urlopen(req, context=ctx)
except ImportError:
    def _urlopen(req):
        return urlopen(req)

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "data" / "music.config.json"
OUTPUT = ROOT / "data" / "music.json"
TOKEN_URL = "https://accounts.spotify.com/api/token"
API = "https://api.spotify.com/v1"
PROFILE = "https://open.spotify.com/user/lkuv124pttnovhci7n5od7cj9"


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def post(url, data, headers):
    body = urlencode(data).encode()
    req = Request(url, data=body, headers=headers, method="POST")
    with _urlopen(req) as resp:
        return json.loads(resp.read().decode())


def get(url, token):
    req = Request(url, headers={"Authorization": f"Bearer {token}"})
    with _urlopen(req) as resp:
        if resp.status == 204:
            return None
        return json.loads(resp.read().decode())


def refresh_token(cid, secret, rt):
    creds = b64encode(f"{cid}:{secret}".encode()).decode()
    return post(
        TOKEN_URL,
        {"grant_type": "refresh_token", "refresh_token": rt},
        {"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"},
    )["access_token"]


def parse_spotify_url(url):
    m = re.search(r"spotify\.com/(playlist|album|track)/([A-Za-z0-9]+)", url or "")
    if not m:
        return None, None
    return m.group(1), m.group(2)


def embed_url(kind, sid):
    return f"https://open.spotify.com/embed/{kind}/{sid}?utm_source=generator&theme=0"


def track_row(t, num):
    artists = ", ".join(a["name"] for a in t.get("artists", []))
    album = t.get("album") or {}
    images = album.get("images") or t.get("album", {}).get("images") or []
    if not images and t.get("images"):
        images = t["images"]
    return {
        "number": num,
        "name": t["name"],
        "artist": artists,
        "explicit": t.get("explicit", False),
        "url": t.get("external_urls", {}).get("spotify"),
        "image": images[0]["url"] if images else None,
    }


def fetch_playlist(token, pid, limit=4):
    pl = get(f"{API}/playlists/{pid}", token)
    items = get(f"{API}/playlists/{pid}/tracks?limit={limit}&offset=0", token)
    tracks = []
    for i, item in enumerate(items.get("items", [])[:limit], 1):
        t = item.get("track")
        if t and t.get("name"):
            tracks.append(track_row(t, i))
    images = pl.get("images") or []
    return {
        "kind": "playlist",
        "title": pl.get("name") or "Playlist",
        "subtitle": pl.get("owner", {}).get("display_name") or "Spotify",
        "image": images[0]["url"] if images else (tracks[0]["image"] if tracks else None),
        "url": pl.get("external_urls", {}).get("spotify"),
        "embed_url": embed_url("playlist", pid),
        "tracks": tracks,
    }


def fetch_album(token, aid, limit=4):
    alb = get(f"{API}/albums/{aid}", token)
    tracks = [track_row(t, t.get("track_number", i)) for i, t in enumerate(alb.get("tracks", {}).get("items", [])[:limit], 1)]
    images = alb.get("images") or []
    artists = ", ".join(a["name"] for a in alb.get("artists", []))
    return {
        "kind": "album",
        "title": alb.get("name") or "Album",
        "subtitle": artists,
        "image": images[0]["url"] if images else None,
        "url": alb.get("external_urls", {}).get("spotify"),
        "embed_url": embed_url("album", aid),
        "tracks": tracks,
    }


def fetch_top_tracks(token, limit=4):
    data = get(f"{API}/me/top/tracks?time_range=long_term&limit={limit}", token)
    tracks = [track_row(t, i) for i, t in enumerate(data.get("items", [])[:limit], 1)]
    first = data.get("items", [{}])[0] if data.get("items") else {}
    album = first.get("album") or {}
    images = album.get("images") or []
    tid = first.get("id")
    return {
        "kind": "top_tracks",
        "title": "All-time favorites",
        "subtitle": "From your Spotify listening",
        "image": images[0]["url"] if images else None,
        "url": PROFILE,
        "embed_url": embed_url("track", tid) if tid else None,
        "tracks": tracks,
    }


def main():
    cfg = load_json(CONFIG)
    cid = os.environ.get("SPOTIFY_CLIENT_ID")
    secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    rt = os.environ.get("SPOTIFY_REFRESH_TOKEN")

    if not all([cid, secret, rt]):
        print("Missing Spotify env vars", file=sys.stderr)
        sys.exit(1)

    token = refresh_token(cid, secret, rt)
    source = cfg.get("source", "playlist")
    url = cfg.get("spotify_url", "")

    if source == "top_tracks":
        payload = fetch_top_tracks(token)
        payload["title"] = cfg.get("title") or payload["title"]
        payload["subtitle"] = cfg.get("subtitle") or payload["subtitle"]
    else:
        kind, sid = parse_spotify_url(url)
        if not kind or not sid:
            print("Invalid spotify_url in music.config.json", file=sys.stderr)
            sys.exit(1)
        if kind == "playlist":
            payload = fetch_playlist(token, sid)
        elif kind == "album":
            payload = fetch_album(token, sid)
        else:
            t = get(f"{API}/tracks/{sid}", token)
            tr = track_row(t, 1)
            album = t.get("album") or {}
            images = album.get("images") or []
            payload = {
                "kind": "track",
                "title": t.get("name"),
                "subtitle": tr["artist"],
                "image": images[0]["url"] if images else None,
                "url": t.get("external_urls", {}).get("spotify"),
                "embed_url": embed_url("track", sid),
                "tracks": [tr],
            }
        if cfg.get("title"):
            payload["title"] = cfg["title"]
        if cfg.get("subtitle"):
            payload["subtitle"] = cfg["subtitle"]

    payload["updated"] = datetime.now(timezone.utc).isoformat()
    payload["profile"] = PROFILE

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")

    print(f"Wrote {OUTPUT} — {payload['title']} ({len(payload.get('tracks', []))} tracks)")


if __name__ == "__main__":
    main()
