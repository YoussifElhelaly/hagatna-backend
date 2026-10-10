#!/bin/bash
set -e

echo "=== Requesting Let's Encrypt SSL certificate for frontend domains ==="
certbot certonly --webroot -w /var/lib/docker/volumes/hagatna_certbot_www/_data \
  --config-dir /opt/hagatna/nginx/certs \
  --work-dir /var/lib/letsencrypt \
  --logs-dir /var/log/letsencrypt \
  --non-interactive --agree-tos --email wecare@hagatnaa.com \
  --renew-hook "docker exec hagatna_nginx nginx -s reload" \
  --cert-name hagatnaa.com \
  -d hagatnaa.com -d www.hagatnaa.com -d admin.hagatnaa.com -d vendor.hagatnaa.com

echo "=== Reloading Nginx ==="
docker exec hagatna_nginx nginx -s reload
echo "=== Done! SSL is active and loaded in Nginx. ==="
