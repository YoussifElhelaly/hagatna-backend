#!/usr/bin/env bash
# ─── Hagatna Database Backup Script ──────────────────────────────────────────
# Usage:
#   ./scripts/backup-db.sh                 # uses DATABASE_URL from env
#   DATABASE_URL="postgresql://..." ./scripts/backup-db.sh
#
# Retention policy:
#   - Keeps last 7 daily backups
#   - Backups stored in ./backups/ by default (override with BACKUP_DIR)
#
# For production, pipe output to S3:
#   AWS_BUCKET=my-bucket ./scripts/backup-db.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DATABASE_URL="${DATABASE_URL:?DATABASE_URL env var is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/hagatna_backup_${TIMESTAMP}.sql.gz"

# ── Create backup directory ───────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ── Extract connection params from DATABASE_URL ───────────────────────────────
# Format: postgresql://USER:PASSWORD@HOST:PORT/DBNAME
DB_USER=$(echo "${DATABASE_URL}" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "${DATABASE_URL}" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "${DATABASE_URL}" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "${DATABASE_URL}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "${DATABASE_URL}" | sed -n 's|.*/\([^?]*\).*|\1|p')

# ── Run pg_dump ───────────────────────────────────────────────────────────────
echo "[$(date)] Starting backup: ${DB_NAME} → ${BACKUP_FILE}"

PGPASSWORD="${DB_PASS}" pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --format=plain \
  --no-password \
  --verbose \
  | gzip > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ── Upload to S3 (optional) ───────────────────────────────────────────────────
if [ -n "${AWS_BUCKET:-}" ]; then
  echo "[$(date)] Uploading to s3://${AWS_BUCKET}/backups/"
  aws s3 cp "${BACKUP_FILE}" "s3://${AWS_BUCKET}/backups/" --storage-class STANDARD_IA
  echo "[$(date)] Upload complete"
fi

# ── Cleanup old local backups ─────────────────────────────────────────────────
echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "hagatna_backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Cleanup done"

echo "[$(date)] Backup job finished successfully"
