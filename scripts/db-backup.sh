#!/usr/bin/env bash
# Dumps the MySQL database (all learning progress) to a gzipped SQL file.
# Destination: BACKUP_DIR from the environment or .env, else ./backups.
# Keeps the newest KEEP_BACKUPS dumps (default 14) and deletes older ones.
set -euo pipefail
cd "$(dirname "$0")/.."

env_value() { # name — reads a value from .env, quotes stripped
  [ -f .env ] || return 0
  grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -E 's/^["'\'']|["'\'']$//g' || true
}

BACKUP_DIR="${BACKUP_DIR:-$(env_value BACKUP_DIR)}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_DIR="${BACKUP_DIR/#\~/$HOME}"
KEEP="${KEEP_BACKUPS:-$(env_value KEEP_BACKUPS)}"
KEEP="${KEEP:-14}"

mkdir -p "$BACKUP_DIR"
out="$BACKUP_DIR/deutsch-$(date +%Y-%m-%d_%H%M%S).sql.gz"
tmp="$out.partial"

# Write to a temp name first so a failed dump never looks like a good backup
# (and a sync client never uploads half a file under the real name).
trap 'rm -f "$tmp"' EXIT
docker compose exec -T db mysqldump -udeutsch -pdeutsch \
  --single-transaction --no-tablespaces --routines deutsch 2> >(grep -v "Using a password" >&2) \
  | gzip > "$tmp"
mv "$tmp" "$out"

echo "Backup written: $out ($(du -h "$out" | cut -f1))"

# Prune old backups, newest first.
ls -1t "$BACKUP_DIR"/deutsch-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "$old"
  echo "Pruned: $old"
done
