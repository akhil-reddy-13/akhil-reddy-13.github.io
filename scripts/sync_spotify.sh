#!/usr/bin/env bash
# Sync Spotify data using Musona's API app + a one-time refresh token in .env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MUSONA_ENV="${MUSONA_ENV:-$HOME/Musona/.env}"

if [[ -f "$MUSONA_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$MUSONA_ENV"
  set +a
  echo "Loaded SPOTIFY_CLIENT_ID/SECRET from Musona"
else
  echo "Musona .env not found at $MUSONA_ENV" >&2
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi

export SPOTIFY_PROFILE_URL="${SPOTIFY_PROFILE_URL:-https://open.spotify.com/user/lkuv124pttnovhci7n5od7cj9}"

if [[ -z "${SPOTIFY_REFRESH_TOKEN:-}" ]]; then
  echo "Missing SPOTIFY_REFRESH_TOKEN. Run: python3 scripts/get_refresh_token.py" >&2
  exit 1
fi

python3 "$ROOT/scripts/update_spotify.py"
