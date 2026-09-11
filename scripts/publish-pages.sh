#!/usr/bin/env bash
#
# Builds the static site (live data from your DB/CMS) and publishes the result
# to the `gh-pages` branch of your repository, so GitHub Pages can serve it for
# free (Settings → Pages → Deploy from a branch → gh-pages → /root).
#
# Works for both cases automatically:
#   - project sites  (repo is NOT named <user>.github.io)    → serves at /<repo-name>
#   - user/org sites (repo IS named <user>.github.io)        → serves at the root
# The base path is detected from the `origin` remote; override it with BASE_PATH.
#
# Usage:   pnpm publish:pages
# Env:     BASE_PATH   Override the detected subpath (leading slash, no trailing).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$ROOT/apps/web/build"
BRANCH=gh-pages

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
fatal() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

detect_base_path() {
	if [ -n "${BASE_PATH:-}" ]; then
		printf '%s' "$BASE_PATH"
		return
	fi

	local remote repo_name
	remote="$(git -C "$ROOT" config --get remote.origin.url || true)"
	[ -z "$remote" ] && return

	# Handles https://…/repo(.git), git@host:user/repo(.git), and local paths.
	repo_name="$(printf '%s' "$remote" | sed -E 's#^.*[:/]([^/]+)$#\1#')"
	repo_name="${repo_name%.git}"
	if [ -z "$repo_name" ] || [ "$repo_name" = "$remote" ]; then
		repo_name="$(basename "$remote")"
		repo_name="${repo_name%.git}"
	fi

	case "$repo_name" in
	*.github.io) printf '' ;; # user/org site → domain root
	*) printf '/%s' "$repo_name" ;; # project site → /repo-name
	esac
}

# ---------------------------------------------------------------------------
# 0. Preflight
# ---------------------------------------------------------------------------
git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
	fatal "not a git repository."
git -C "$ROOT" config --get remote.origin.url >/dev/null 2>&1 ||
	fatal "no 'origin' remote configured. Add it first, e.g:\n    git remote add origin git@github.com:<you>/<repo>.git"

BASE_PATH="$(detect_base_path)"
if [ -n "$BASE_PATH" ]; then
	log "Base path detected: ${BASE_PATH} (project site)."
else
	log "No base path (domain root / user site). Override with BASE_PATH=… if needed."
fi

# ---------------------------------------------------------------------------
# 1. Build (live data from the DB/CMS)
# ---------------------------------------------------------------------------
BASE_PATH="$BASE_PATH" "$SCRIPT_DIR/build-site.sh"

[ -d "$BUILD_DIR" ] || fatal "build directory not found at $BUILD_DIR"
log "Publishing $BUILD_DIR → branch '$BRANCH'"

# ---------------------------------------------------------------------------
# 2. Publish the build output to the gh-pages branch
# ---------------------------------------------------------------------------
SITE_DIR="$(mktemp -d)"

if git -C "$ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
	git -C "$ROOT" worktree add "$SITE_DIR" "$BRANCH"
elif git -C "$ROOT" show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
	git -C "$ROOT" worktree add --track -b "$BRANCH" "$SITE_DIR" "origin/$BRANCH"
else
	log "Creating a new '$BRANCH' branch."
	git -C "$ROOT" worktree add --detach "$SITE_DIR"
	git -C "$SITE_DIR" checkout --orphan "$BRANCH" >/dev/null 2>&1 || true
fi

# Replace the branch contents with the fresh build, keeping the worktree's
# .git metadata file intact.
find "$SITE_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$BUILD_DIR"/. "$SITE_DIR"/

git -C "$SITE_DIR" add -A
if git -C "$SITE_DIR" diff --cached --quiet; then
	log "No changes since the last publish — nothing to commit."
else
	git -C "$SITE_DIR" commit -m "deploy: static site build ($(date -u +'%Y-%m-%d %H:%M UTC'))"
	git -C "$SITE_DIR" push origin "$BRANCH"
	log "Published to origin/$BRANCH."
fi

git -C "$ROOT" worktree remove --force "$SITE_DIR"

log "Done! GitHub Pages serves the site from the '$BRANCH' branch."