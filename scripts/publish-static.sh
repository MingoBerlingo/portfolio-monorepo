#!/usr/bin/env bash
#
# Builds the static site (live data from your DB/CMS) and publishes it as a
# standalone static website: the whole build output becomes the root of a
# separate repository's branch. Ideal for a `<user>.github.io` repo (served at
# the domain root) or any other static host.
#
# One-time setup:
#   git remote add pages git@github.com:<you>/<you>.github.io.git
#
# Usage:   pnpm publish:static
# Env:
#   PAGES_REMOTE    git remote holding the target repository (default: pages)
#   PAGES_REPO_URL  target repository URL (used when the remote is not set)
#   PAGES_BRANCH    branch to publish to (default: main)
#   BASE_PATH       override the detected base path (leading slash, no trailing)
#
# The published history is always a single fresh commit (force-pushed), so the
# site repo never accumulates stale builds.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$ROOT/apps/web/build"
PAGES_REMOTE="${PAGES_REMOTE:-pages}"
PAGES_BRANCH="${PAGES_BRANCH:-main}"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
fatal() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Resolve the target repository
# ---------------------------------------------------------------------------
TARGET_URL="${PAGES_REPO_URL:-}"
if [ -z "$TARGET_URL" ]; then
	TARGET_URL="$(git -C "$ROOT" config --get "remote.${PAGES_REMOTE}.url" || true)"
fi
[ -n "$TARGET_URL" ] || fatal "no target repository configured.
  Add the site repo as a remote first, e.g.:
      git remote add ${PAGES_REMOTE} git@github.com:<you>/<you>.github.io.git
  (or run with PAGES_REPO_URL=<url>)."

log "Target repository: ${TARGET_URL} (branch '${PAGES_BRANCH}')"

# ---------------------------------------------------------------------------
# 2. Detect the base path ('' for <user>.github.io → domain root)
# ---------------------------------------------------------------------------
detect_base_path() {
	if [ -n "${BASE_PATH:-}" ]; then
		printf '%s' "$BASE_PATH"
		return
	fi

	local repo_name
	repo_name="$(printf '%s' "$TARGET_URL" | sed -E 's#^.*[:/]([^/]+)$#\1#')"
	repo_name="${repo_name%.git}"

	case "$repo_name" in
	*.github.io) printf '' ;; # user/org site → domain root
	*) printf '/%s' "$repo_name" ;; # project site → /repo-name
	esac
}

BASE_PATH="$(detect_base_path)"
if [ -n "$BASE_PATH" ]; then
	log "Base path: '${BASE_PATH}'"
else
	log "Base path: none (served at the domain root)"
fi

# ---------------------------------------------------------------------------
# 3. Build (live data from the DB/CMS)
# ---------------------------------------------------------------------------
BASE_PATH="$BASE_PATH" "$SCRIPT_DIR/build-site.sh"

[ -d "$BUILD_DIR" ] || fatal "build directory not found at $BUILD_DIR"

# ---------------------------------------------------------------------------
# 4. Publish the build output as a fresh single commit
# ---------------------------------------------------------------------------
STAGE_DIR="$(mktemp -d)"
log "Staging the site in a temporary repository..."

cp -R "$BUILD_DIR"/. "$STAGE_DIR"/
# Without this, GitHub Pages (Jekyll) drops the `_app/` directory → 404 chunks.
touch "$STAGE_DIR/.nojekyll"

(
	cd "$STAGE_DIR"
	git init -q
	git checkout -q -b "$PAGES_BRANCH"
	git config user.name "$(git -C "$ROOT" config user.name || echo 'publish-static')"
	git config user.email "$(git -C "$ROOT" config user.email || echo 'publish-static@localhost')"
	git add -A
	git commit -q -m "deploy: static site build ($(date -u +'%Y-%m-%d %H:%M UTC'))"
	git push --force "$TARGET_URL" "HEAD:${PAGES_BRANCH}"
)

rm -rf "$STAGE_DIR"

log "Published! The static site is now on ${TARGET_URL} (${PAGES_BRANCH})."
log "Make sure GitHub Pages is set to: Deploy from a branch → ${PAGES_BRANCH} / (root)."
