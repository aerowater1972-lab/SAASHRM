#!/usr/bin/env bash
# Flexy HRMS — Database Restore Script
# Usage:  scripts/restore.sh [--force] <backup_file>
#
# Requires: pg_restore (PostgreSQL client), DATABASE_URL in .env or env
# Warning: Overwrites existing data in the target database.
#
# --force skips the confirmation prompt (for CI/automation).

set -euo pipefail

FORCE=0
if [ "${1:-}" = "--force" ] || [ "${1:-}" = "-f" ]; then
  FORCE=1
  shift
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 [--force] <backup_file>"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${DIR}/apps/api/.env"

if [ -z "${DATABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  export "$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1)"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set and not found in $ENV_FILE"
  exit 1
fi

echo "⚠️  About to restore $BACKUP_FILE into the database at DATABASE_URL"
echo "   This will OVERWRITE existing data."

# Verify the archive is readable before touching the database.
pg_restore --list "$BACKUP_FILE" > /dev/null
echo "✅ Archive verified."

if [ "$FORCE" -ne 1 ]; then
  read -rp "Continue? [y/N] " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
  fi
fi

pg_restore --clean --if-exists --no-owner --no-acl \
  -d "$DATABASE_URL" "$BACKUP_FILE"

echo "✅ Restore complete from: $BACKUP_FILE"
