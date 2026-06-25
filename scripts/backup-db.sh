#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Hagatna — PostgreSQL Backup Script
# ══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./scripts/backup-db.sh                    # Standard backup
#   DATABASE_URL="..." ./scripts/backup-db.sh # Custom connection
#   AWS_BUCKET=my-bucket ./scripts/backup-db.sh # With S3 upload
#
# What it does:
#   1. Creates a compressed SQL dump with timestamp
#   2. Optionally uploads to S3-compatible storage
#   3. Removes local backups older than RETENTION_DAYS (default: 7)
#
# Cron setup (runs daily at 2 AM):
#   echo "0 2 * * * cd /opt/hagatna && sh scripts/backup-db.sh >> logs/backup.log 2>&1" | crontab -
#
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
DATABASE_URL="${DATABASE_URL:?DATABASE_URL env var is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/hagatna_backup_${TIMESTAMP}.sql.gz"

# ── Create backup directory ──────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ── Extract connection params from DATABASE_URL ──────────────────────────────
# Format: postgresql://USER:PASSWORD@HOST:PORT/DBNAME
DB_USER=$(echo "${DATABASE_URL}" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "${DATABASE_URL}" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "${DATABASE_URL}" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "${DATABASE_URL}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "${DATABASE_URL}" | sed -n 's|.*/\([^?]*\).*|\1|p')

# ── Run pg_dump ──────────────────────────────────────────────────────────────
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

# ── Verify backup integrity ─────────────────────────────────────────────────
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "[$(date)] ERROR: Backup file is corrupted!"
  exit 1
fi
echo "[$(date)] Backup integrity verified ✓"

# ── Upload to S3 (optional) ──────────────────────────────────────────────────
if [ -n "${AWS_BUCKET:-}" ] && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  echo "[$(date)] Uploading to s3://${AWS_BUCKET}/backups/"
  aws s3 cp "${BACKUP_FILE}" "s3://${AWS_BUCKET}/backups/${BACKUP_FILE##*/}" \
    --storage-class STANDARD_IA \
    --only-show-errors
  echo "[$(date)] Upload complete ✓"
elif [ -n "${AWS_BUCKET:-}" ]; then
  echo "[$(date)] WARNING: AWS_BUCKET is set but AWS_ACCESS_KEY_ID is missing. Skipping S3 upload."
fi

# ── Cleanup old local backups ────────────────────────────────────────────────
echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "hagatna_backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
echo "[$(date)] Removed ${DELETED_COUNT} old backup(s)"

# ── Summary ──────────────────────────────────────────────────────────────────
LOCAL_COUNT=$(find "${BACKUP_DIR}" -name "hagatna_backup_*.sql.gz" | wc -l)
LOCAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "[$(date)] Local backups: ${LOCAL_COUNT} files, ${LOCAL_SIZE} total"
echo "[$(date)] Backup job finished successfully ✓"
