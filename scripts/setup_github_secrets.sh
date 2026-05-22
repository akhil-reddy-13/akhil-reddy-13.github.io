#!/usr/bin/env bash
# Set GitHub Actions secrets from local .env (run once after: gh auth login)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Log in first: gh auth login"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run get_refresh_token.py first" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for key in SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET SPOTIFY_REFRESH_TOKEN SPOTIFY_PROFILE_URL; do
  val="${!key:-}"
  if [[ -z "$val" ]]; then
    echo "Missing $key in .env" >&2
    exit 1
  fi
  echo "$val" | gh secret set "$key" --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)"
  echo "Set $key"
done

echo "Done. Triggering workflow..."
gh workflow run "Update Music" --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)" 2>/dev/null || gh workflow run spotify.yml --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Secrets configured and sync started."
