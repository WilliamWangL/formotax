#!/usr/bin/env bash
# End-to-end smoke test against a running stack.
#
#   bash scripts/smoke.sh                                   # via nginx on :8080
#   BASE=http://localhost:4000/api/v1 bash scripts/smoke.sh # direct to the API
#
# Exits non-zero on the first failed assertion. Requires node (JSON parsing and
# HMAC signing) and a database that has been migrated and seeded.
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$repo_root/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$repo_root/.env"
  set +a
fi

BASE=${BASE:-http://localhost:8080/api/v1}
EMAIL="smoke$(date +%s)@example.com"
PASS="SmokeTest123!"
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@formotax.com}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-ChangeMe123!}
failures=0

hr() { printf '\n=== %s ===\n' "$1"; }
jget() { node -e "try{const v=JSON.parse(process.argv[1]);console.log(process.argv[2].split('.').reduce((a,k)=>a==null?a:a[k],v)??'')}catch(e){console.log('')}" "$1" "$2"; }
check() {
  local label=$1 actual=$2 expected=$3
  if [ "$actual" = "$expected" ]; then
    printf 'PASS  %-46s %s\n' "$label" "$actual"
  else
    printf 'FAIL  %-46s got=%s want=%s\n' "$label" "$actual" "$expected"
    failures=$((failures + 1))
  fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

hr "Health"
HEALTH=$(curl -s "$BASE/health")
check "GET /health" "$(jget "$HEALTH" status)" "ok"
check "database" "$(jget "$HEALTH" database)" "up"
check "redis" "$(jget "$HEALTH" redis)" "up"
check "templates" "$(jget "$HEALTH" templates)" "ok"
check "payment provider is paypal" "$(jget "$HEALTH" paymentProvider)" "paypal"

hr "Official PDF template"
curl -s -D /tmp/tax-smoke-headers.txt -o /tmp/tax-smoke-w9.pdf "$BASE/tax-forms/W9/template"
check "GET /tax-forms/W9/template" "$(head -c 5 /tmp/tax-smoke-w9.pdf)" "%PDF-"
check "revision header" "$(grep -ci '^x-template-revision:' /tmp/tax-smoke-headers.txt)" "1"

hr "Registration and session"
REG=$(curl -s -X POST "$BASE/auth/register" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"fullName\":\"Smoke Tester\"}")
ACCESS=$(jget "$REG" tokens.accessToken)
REFRESH=$(jget "$REG" tokens.refreshToken)
check "POST /auth/register" "$(jget "$REG" user.email)" "$EMAIL"
check "GET /users/me" "$(curl -s "$BASE/users/me" -H "authorization: Bearer $ACCESS" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).email))")" "$EMAIL"
check "guards: anonymous" "$(status "$BASE/users/me")" "401"

hr "Download access"
check "anonymous access rejected" "$(status "$BASE/downloads/access?formCode=W9")" "401"
check "no access before paying" "$(jget "$(curl -s "$BASE/downloads/access?formCode=W9" -H "authorization: Bearer $ACCESS")" active)" "false"
check "list price" "$(jget "$(curl -s "$BASE/downloads/access?formCode=W9" -H "authorization: Bearer $ACCESS")" price)" "1.00"
check "re-download window" "$(jget "$(curl -s "$BASE/downloads/access?formCode=W9" -H "authorization: Bearer $ACCESS")" accessHours)" "24"

hr "Form metadata"
FORM=$(curl -s -X POST "$BASE/user-tax-forms" -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"formCode":"W9","version":"2024","title":"w-9-2024.pdf"}')
check "POST /user-tax-forms" "$(jget "$FORM" formCode)" "W9"
check "GET /user-tax-forms" "$(jget "$(curl -s "$BASE/user-tax-forms?page=1&pageSize=5" -H "authorization: Bearer $ACCESS")" total)" "1"

hr "PayPal checkout"
PAYPAL_STATUS=$(jget "$HEALTH" paypal)
if [ "$PAYPAL_STATUS" = "configured" ]; then
  # Credentials are present: the API must hand out a real PayPal approval URL.
  # The order is left pending on purpose — capturing it would charge a buyer.
  ORDER=$(curl -s -X POST "$BASE/downloads/checkout" -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
    -d '{"formCode":"W9"}')
  ORDERNO=$(jget "$ORDER" orderNo)
  check "POST /downloads/checkout" "$(jget "$ORDER" provider)" "paypal"
  check "checkout amount" "$(jget "$ORDER" amount)" "1.00"
  check "approval URL hosted by PayPal" "$(echo "$(jget "$ORDER" checkoutUrl)" | grep -c 'paypal.com')" "1"
  check "order starts pending" "$(jget "$(curl -s "$BASE/downloads/orders/$ORDERNO" -H "authorization: Bearer $ACCESS")" status)" "pending"
  check "nothing unlocked before payment" "$(jget "$(curl -s "$BASE/downloads/access?formCode=W9" -H "authorization: Bearer $ACCESS")" active)" "false"
  check "GET /downloads/orders" "$(jget "$(curl -s "$BASE/downloads/orders?page=1&pageSize=5" -H "authorization: Bearer $ACCESS")" total)" "1"
else
  check "checkout refused without PayPal credentials" "$(curl -s -o /tmp/tax-smoke-pay.json -w '%{http_code}' \
    -X POST "$BASE/downloads/checkout" -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' -d '{"formCode":"W9"}')" "400"
  check "refusal code" "$(jget "$(cat /tmp/tax-smoke-pay.json)" code)" "PAYMENT_NOT_CONFIGURED"
fi

hr "Token rotation and revocation"
ROTATED=$(curl -s -X POST "$BASE/auth/refresh" -H 'content-type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}")
NEWACCESS=$(jget "$ROTATED" tokens.accessToken)
check "POST /auth/refresh issues a new access token" "$([ ${#NEWACCESS} -gt 100 ] && echo yes || echo no)" "yes"
check "POST /auth/logout" "$(status -X POST "$BASE/auth/logout" -H "authorization: Bearer $NEWACCESS")" "204"
check "revoked token rejected" "$(status "$BASE/users/me" -H "authorization: Bearer $NEWACCESS")" "401"

hr "Role separation"
ATOKEN=$(jget "$(curl -s -X POST "$BASE/admin/auth/login" -H 'content-type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")" accessToken)
check "admin token on user endpoint" "$(status "$BASE/users/me" -H "authorization: Bearer $ATOKEN")" "403"
check "user token on admin endpoint" "$(status "$BASE/admin/stats" -H "authorization: Bearer $ACCESS")" "403"
check "admin stats" "$(status "$BASE/admin/stats" -H "authorization: Bearer $ATOKEN")" "200"

hr "PayPal webhook"
check "missing signature rejected" "$(jget "$(curl -s -X POST "$BASE/payments/webhook/paypal" \
  -H 'content-type: application/json' -d '{"event_type":"PAYMENT.CAPTURE.COMPLETED"}')" code)" "INVALID_SIGNATURE"
check "removed mock webhook is gone" "$(status -X POST "$BASE/payments/webhook/mock" -H 'content-type: application/json' -d '{}')" "404"

printf '\n%s\n' "$([ $failures -eq 0 ] && echo 'All smoke checks passed.' || echo "$failures check(s) failed.")"
exit $([ $failures -eq 0 ] && echo 0 || echo 1)
