#!/usr/bin/env python3
"""Fetch Spotify now playing + album context and write data/spotify.json."""

import json
import os
import sys
from base64 import b64encode
from datetime import datetime, timezone
import ssl
from urllib.parse import urlencode
from urllib.request import Request, urlopen

try:
    import certifi

    def _urlopen(req):
        ctx = ssl.create_default_context(cafile=certifi.where())
        return urlopen(req, context=ctx)
except ImportError:
    def _urlopen(req):
        return urlopen(req)

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "data", "spotify.json")
TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE = "https://api.spotify.com/v1"
DEFAULT_PROFILE = "https://open.spotify.com/user/lkuv124pttnovhci7n5od7cj9"


def post(url, data, headers):
    body = urlencode(data).encode() if isinstance(data, dict) else data
    req = Request(url, data=body, headers=headers, method="POST")
    with _urlopen(req) as resp:
        return json.loads(resp.read().decode())


def get(url, token):
    req = Request(url, headers={"Authorization": f"Bearer {token}"})
    with _urlopen(req) as resp:
        if resp.status == 204:
            return None
        return json.loads(resp.read().decode())


def refresh_access_token(client_id, client_secret, refresh_token):
    creds = b64encode(f"{client_id}:{client_secret}".encode()).decode()
    return post(
        TOKEN_URL,
        {"grant_type": "refresh_token", "refresh_token": refresh_token},
        {
            "Authorization": f"Basic {creds}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )["access_token"]


def track_payload(track, track_number=None):
    artists = ", ".join(a["name"] for a in track.get("artists", []))
    album = track.get("album") or {}
    images = album.get("images") or []
    return {
        "track_number": track_number or track.get("track_number"),
        "name": track["name"],
        "artist": artists,
        "album": album.get("name"),
        "explicit": track.get("explicit", False),
        "image": images[0]["url"] if images else None,
        "url": track.get("external_urls", {}).get("spotify"),
        "duration_ms": track.get("duration_ms"),
    }


def pick_album_window(tracks, current_number, window=3):
    """Return up to `window` tracks centered on the current track number."""
    if not tracks or current_number is None:
        return tracks[:window]
    idx = next((i for i, t in enumerate(tracks) if t.get("track_number") == current_number), 0)
    start = max(0, idx - 1)
    end = min(len(tracks), start + window)
    start = max(0, end - window)
    return tracks[start:end]


def main():
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    refresh_token = os.environ.get("SPOTIFY_REFRESH_TOKEN")
    profile_url = os.environ.get("SPOTIFY_PROFILE_URL", DEFAULT_PROFILE)

    if not all([client_id, client_secret, refresh_token]):
        print("Missing SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REFRESH_TOKEN", file=sys.stderr)
        sys.exit(1)

    token = refresh_access_token(client_id, client_secret, refresh_token)

    payload = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "profile": profile_url,
        "nowPlaying": None,
        "albumTracks": [],
        "tracks": [],
    }

    # Currently playing (preferred for the widget)
    playing = get(f"{API_BASE}/me/player/currently-playing", token)
    if playing and playing.get("item"):
        item = playing["item"]
        album = item.get("album") or {}
        images = album.get("images") or []
        payload["nowPlaying"] = {
            **track_payload(item, item.get("track_number")),
            "progress_ms": playing.get("progress_ms", 0),
            "is_playing": playing.get("is_playing", False),
        }

        album_id = album.get("id")
        if album_id:
            album_data = get(f"{API_BASE}/albums/{album_id}/tracks?limit=50", token)
            if album_data:
                album_tracks = [
                    track_payload(t, t.get("track_number"))
                    for t in album_data.get("items", [])
                ]
                payload["albumTracks"] = pick_album_window(
                    album_tracks, item.get("track_number"), window=3
                )

    # Fallback: recently played
    recent = get(f"{API_BASE}/me/player/recently-played?limit=8", token)
    if recent:
        for entry in recent.get("items", []):
            track = entry["track"]
            payload["tracks"].append({
                **track_payload(track),
                "played_at": entry.get("played_at"),
            })

        if not payload["nowPlaying"] and payload["tracks"]:
            latest = payload["tracks"][0]
            payload["nowPlaying"] = {
                **latest,
                "progress_ms": 0,
                "is_playing": False,
            }
            # Group same-album recent tracks as pseudo album window
            album_name = latest.get("album")
            same_album = [t for t in payload["tracks"] if t.get("album") == album_name][:3]
            payload["albumTracks"] = [
                {k: v for k, v in t.items() if k != "played_at"} for t in same_album
            ]

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")

    print(f"Wrote spotify.json — now playing: {bool(payload['nowPlaying'])}")


if __name__ == "__main__":
    main()
