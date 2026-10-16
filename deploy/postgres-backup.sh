#!/usr/bin/env bash
# Backup Postgres quotidien (cron recommandé).
# Ex. : 0 2 * * * /var/www/semaine-industrie/deploy/postgres-backup.sh
# Prérequis : .pgpass ou PGPASSWORD, ou peer auth pour l'utilisateur.

set -euo pipefail

DB_NAME="${DB_NAME:-semaine_industrie}"
DB_USER="${DB_USER:-semaine_industrie}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/semaine-industrie}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"

pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$FILE"
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime +"$KEEP_DAYS" -delete

echo "Backup: $FILE"
