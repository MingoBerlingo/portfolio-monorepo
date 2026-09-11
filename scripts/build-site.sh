#!/usr/bin/env bash
#
# One-command "production build" of the static site.
#
# Pulls content + media directly from your local CMS/database at build time,
# prerenders every page into apps/web/build, then stops the services it started.
#
# Usage:      pnpm build:site
#
# Environment:
#   BASE_PATH   Subpath the site is hosted under (leading slash, no trailing
#               slash). Empty = domain root. GitHub Pages project sites use
#               /<repo-name>. `pnpm publish:static` sets this automatically.
#   CMS_API_URL Base URL of the CMS (default: http://localhost:3000).
#
# The site only runs during the build: after this command finishes you get a
# fully static website in apps/web/build that any static host (e.g. GitHub
# Pages) can serve for free.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CMS_URL="${CMS_API_URL:-http://localhost:3000}"
CMS_PORT="$(printf '%s' "$CMS_URL" | sed -nE 's#^.*:([0-9]+)$#\1#p')"
[ -n "$CMS_PORT" ] || CMS_PORT=3000
GRAPHQL_URL="${CMS_URL}/api/graphql"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
fatal() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

started_cms=false
cleanup() {
	if [ "$started_cms" = true ]; then
		log "Stopping the CMS server we started (port ${CMS_PORT})..."
		# shellcheck disable=SC2046
		kill $(lsof -ti tcp:"${CMS_PORT}" 2>/dev/null) 2>/dev/null || true
	fi
}
trap cleanup EXIT

cms_ready() {
	local code
	code="$(curl -s -o /dev/null -w '%{http_code}' -m 3 -X POST "$GRAPHQL_URL" \
		-H 'Content-Type: application/json' \
		-d '{"query":"{ Profile { id } }"}')"
	[ "$code" = "200" ]
}

# ---------------------------------------------------------------------------
# 1. Make sure the CMS (and its database) is reachable
# ---------------------------------------------------------------------------
log "Checking CMS at $GRAPHQL_URL"

if cms_ready; then
	log "CMS is already running — using it as-is."
else
	[ -f "$ROOT/apps/cms/.env" ] ||
		fatal "apps/cms/.env not found. Copy apps/cms/.env.example to apps/cms/.env first."

	command -v lsof >/dev/null 2>&1 || fatal "lsof is required (it ships with macOS)."

	# MongoDB (only if nothing listens on 27017 already)
	if lsof -ti tcp:27017 >/dev/null 2>&1; then
		log "MongoDB is already running on port 27017."
	else
		log "Starting MongoDB via Docker..."
		(cd "$ROOT" && docker compose up -d)
	fi

	# Payload CMS (first boot compiles Next.js — be patient)
	log "Starting Payload CMS (logs: .build/cms.log) ..."
	mkdir -p "$ROOT/.build"
	(cd "$ROOT" && nohup pnpm --filter cms dev >"$ROOT/.build/cms.log" 2>&1 &)

	for attempt in $(seq 1 180); do
		if cms_ready; then
			started_cms=true
			log "CMS is ready after ~${attempt}s."
			break
		fi
		sleep 1
	done

	if [ "$started_cms" != true ]; then
		fatal "CMS did not become ready within 180s. Check .build/cms.log"
	fi
fi

# ---------------------------------------------------------------------------
# 2. Production build — prerender every page with live data from the CMS
# ---------------------------------------------------------------------------
log "Building static site (BASE_PATH='${BASE_PATH:-}')..."
(cd "$ROOT" && BASE_PATH="${BASE_PATH:-}" pnpm --filter web build)

# GitHub Pages (Jekyll) skips files/directories starting with `_` — including the
# `_app/` folder that holds all JS/CSS chunks — unless a `.nojekyll` file exists
# at the site root. `static/.nojekyll` normally ships it; this is a safety net.
if [ -d "$ROOT/apps/web/build" ]; then
	touch "$ROOT/apps/web/build/.nojekyll"
fi

log "Done! The static website is ready in apps/web/build."
[ -n "${BASE_PATH:-}" ] && log "Built with subpath base '${BASE_PATH}' (links/media prefixed)."
log "Preview it with:   pnpm web:preview"
log "Publish it with:   pnpm publish:static"