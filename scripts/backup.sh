#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL muss gesetzt sein}"
mkdir -p backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="backups/lupenrein-${STAMP}.dump"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$FILE"
echo "$FILE"
