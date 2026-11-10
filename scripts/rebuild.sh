#!/usr/bin/env bash
# Low-memory rebuild + restart for the inventory monorepo (512 MB RAM + 1 GB swap).
#
# Usage:
#   ./scripts/rebuild.sh            # build backend, then frontend, then restart pm2
#
# Optional env overrides:
#   HEAP_MB=512 ./scripts/rebuild.sh          # lower Node heap cap if 640 still OOMs
#   VITE_BASE_PATH=/ ./scripts/rebuild.sh                 # standalone mode (default: /inventory-app/)
#   KEEP_RUNNING=1 ./scripts/rebuild.sh       # don't stop pm2 apps during build
#                                             # (no downtime, but higher OOM risk)
#
# Builds run one at a time and bypass turbo on purpose: turbo would run them in
# parallel, and its strict env mode would drop VITE_BASE_PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HEAP_MB="${HEAP_MB:-640}"
export VITE_BASE_PATH="${VITE_BASE_PATH:-/inventory-app/}"
export NODE_OPTIONS="--max-old-space-size=${HEAP_MB}"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

# If anything fails after we stopped the apps, try to bring them back up.
STOPPED=0
on_exit() {
  local code=$?
  if [[ $code -ne 0 && $STOPPED -eq 1 ]]; then
    printf '\n\033[1;31mBuild failed (exit %s). Restarting pm2 apps with whatever is in dist/.\033[0m\n' "$code"
    pm2 restart all --update-env || true
  fi
}
trap on_exit EXIT

log "Memory before build"
free -m

if [[ "${KEEP_RUNNING:-0}" != "1" ]]; then
  log "Stopping pm2 apps to free RAM"
  pm2 stop all
  STOPPED=1
fi

log "Building backend (heap cap ${HEAP_MB} MB)"
pnpm --filter ./apps/backend run build

log "Building frontend (VITE_BASE_PATH=${VITE_BASE_PATH})"
pnpm --filter ./apps/frontend run build

log "Restarting pm2 apps"
pm2 restart all --update-env
STOPPED=0

log "Done"
pm2 ls
free -m
