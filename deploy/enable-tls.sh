#!/usr/bin/env bash
# Issue the TLS certificate for formotax.ecommica.com and switch the host
# nginx site from the bootstrap (plain HTTP) block to the HTTPS one.
#
# Run on the server as root after the DNS A record points at this host:
#   sudo bash deploy/enable-tls.sh
set -euo pipefail

domain=formotax.ecommica.com
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
conf=/etc/nginx/conf.d/$domain.conf

if ! getent hosts "$domain" >/dev/null; then
  echo "DNS for $domain does not resolve yet; add the A record first." >&2
  exit 1
fi

# 1. Bootstrap block: ACME webroot + temporary HTTP passthrough. Only needed
#    while the certificate is missing, so re-running never drops HTTPS.
if [ ! -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
  install -m 0644 "$repo_root/deploy/nginx/$domain.bootstrap.conf" "$conf"
  nginx -t
  nginx -s reload

  # 2. Certificate (webroot shares /var/www/letsencrypt with the other sites).
  certbot certonly --webroot -w /var/www/letsencrypt -d "$domain" \
    --cert-name "$domain" --non-interactive --agree-tos --keep-until-expiring
fi

# 3. Full block: HTTP -> HTTPS redirect, proxy to the loopback ports
#    (web 3004, api 8083).
install -m 0644 "$repo_root/deploy/nginx/$domain.conf" "$conf"
nginx -t
nginx -s reload

echo "https://$domain is now served through nginx."
