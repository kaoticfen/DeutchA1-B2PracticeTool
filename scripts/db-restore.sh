#!/usr/bin/env bash
# Restores a backup made by db-backup.sh, replacing the current database.
# Usage: npm run db:restore [-- path/to/backup.sql.gz]   (default: newest backup)
set -euo pipefail
cd "$(dirname "$0")/.."

env_value() { # name — reads a value from .env, quotes stripped
  [ -f .env ] || return 0
  grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -E 's/^["'\'']|["'\'']$//g' || true
}

BACKUP_DIR="${BACKUP_DIR:-$(env_value BACKUP_DIR)}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_DIR="${BACKUP_DIR/#\~/$HOME}"

file="${1:-$(ls -1t "$BACKUP_DIR"/deutsch-*.sql.gz 2>/dev/null | head -n1 || true)}"
if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "No backup found (looked in $BACKUP_DIR)." >&2
  exit 1
fi

# Check the archive is intact before touching the database.
gzip -t "$file"

echo "This replaces ALL current data in the 'deutsch' database with:"
echo "  $file"
read -r -p "Type 'yes' to continue: " answer
[ "$answer" = "yes" ] || { echo "Aborted."; exit 1; }

gunzip -c "$file" | docker compose exec -T db mysql -udeutsch -pdeutsch deutsch 2> >(grep -v "Using a password" >&2)
echo "Restored from $file"
