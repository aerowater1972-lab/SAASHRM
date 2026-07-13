#!/usr/bin/env bash
# Flexy HRMS — Database Backup Script
# Usage:  scripts/backup.sh [output_dir]
# Default output: ./backups/<db>_<date>.dump
#
# Requires: pg_dump (PostgreSQL client), DATABASE_URL in .env or env

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${DIR}/apps/api/.env"
OUTPUT_DIR="${1:-${DIR}/backups}"

# Load DATABASE_URL from .env if not set
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  export "$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1)"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set and not found in $ENV_FILE"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="flexy_hrms"
OUTPUT="${OUTPUT_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

mkdir -p "$OUTPUT_DIR"

pg_dump --format=custom --no-owner --compress=9 \
  "$DATABASE_URL" > "$OUTPUT"

echo "✅ Backup saved: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
