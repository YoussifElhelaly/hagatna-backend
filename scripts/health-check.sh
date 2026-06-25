#!/usr/bin/env bash
# ─── Hagatna Health Check Script ────────────────────────────────────────────
# Run periodically to verify all services are responding.
# Usage: ./scripts/health-check.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="${HAGATNA_DOMAIN:-https://hagatna.com}"
FAILED=0

check() {
  local name=$1
  local url=$2
  local expected=$3

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $name (HTTP $status)"
  else
    echo -e "  ${RED}✗${NC} $name (HTTP $status, expected $expected)"
    FAILED=$((FAILED + 1))
  fi
}

echo "═══════════════════════════════════════════════════════════════"
echo "  Hagatna Health Check — $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Frontend:"
check "Customer"  "${DOMAIN}/" "200"
check "Admin"     "${DOMAIN}/admin/" "200"
check "Vendor"    "${DOMAIN}/vendor/" "200"

echo ""
echo "Backend:"
check "API Health" "${DOMAIN}/api/v1/health" "200"
check "WebSocket"  "${DOMAIN}/socket.io/?EIO=4&transport=polling" "200"

echo ""
echo "Infrastructure:"

# Check Docker containers
for container in hagatna_nginx hagatna_backend hagatna_customer hagatna_admin hagatna_vendor hagatna_postgres hagatna_redis; do
  status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
  health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no healthcheck")

  if [ "$status" = "running" ]; then
    if [ "$health" = "healthy" ] || [ "$health" = "no healthcheck" ]; then
      echo -e "  ${GREEN}✓${NC} $container ($status, $health)"
    else
      echo -e "  ${YELLOW}⚠${NC} $container ($status, $health)"
    fi
  else
    echo -e "  ${RED}✗${NC} $container ($status)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}$FAILED check(s) failed!${NC}"
  exit 1
fi
