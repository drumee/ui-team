#!/usr/bin/env bash
# Sync locale entries to the API endpoint.
# Each key becomes one POST call with all language translations.
#
# Usage:
#   ./bin/update-locale.sh [OPTIONS]
#
# Options:
#   -e, --endpoint  URL    API endpoint  (default: $LOCALE_ENDPOINT)
#   -u, --user      USER   Username      (default: $LOCALE_USER)
#   -p, --password  PASS   Password      (default: $LOCALE_PASSWORD)
#   -t, --token     TOKEN  Bearer token  (default: $LOCALE_TOKEN)
#   -s, --cookie    VALUE  Session cookie value (default: $LOCALE_COOKIE)
#   -c, --category  CAT    Category tag  (default: ui)
#   -k, --key       KEY    Sync only this key (optional)
#   -d, --dry-run          Print payloads without sending
#   -h, --help             Show this help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCALE_DIR="$(dirname "$SCRIPT_DIR")/locale"

# ── defaults (override with env vars or CLI flags) ──────────────────────────
ENDPOINT="${LOCALE_ENDPOINT:-}"
API_USER="${LOCALE_USER:-}"
API_PASS="${LOCALE_PASSWORD:-}"
API_TOKEN="${LOCALE_TOKEN:-}"
API_COOKIE="${LOCALE_COOKIE:-}"
CATEGORY="ui"
FILTER_KEY=""
DRY_RUN=0

# ── argument parsing ─────────────────────────────────────────────────────────
usage() {
  sed -n '/^# Usage:/,/^[^#]/p' "$0" | grep '^#' | sed 's/^# \?//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--endpoint)  ENDPOINT="$2";    shift 2 ;;
    -u|--user)      API_USER="$2";    shift 2 ;;
    -p|--password)  API_PASS="$2";    shift 2 ;;
    -t|--token)     API_TOKEN="$2";   shift 2 ;;
    -s|--cookie)    API_COOKIE="$2";  shift 2 ;;
    -c|--category)  CATEGORY="$2";    shift 2 ;;
    -k|--key)       FILTER_KEY="$2";  shift 2 ;;
    -d|--dry-run)   DRY_RUN=1;        shift   ;;
    -h|--help)      usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── validation ────────────────────────────────────────────────────────────────
if [[ -z "$ENDPOINT" ]]; then
  echo "Error: endpoint is required (--endpoint or \$LOCALE_ENDPOINT)" >&2
  exit 1
fi

if [[ -z "$API_TOKEN" && -z "$API_COOKIE" && ( -z "$API_USER" || -z "$API_PASS" ) ]]; then
  echo "Error: provide --token, --cookie, OR both --user and --password" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required (brew install jq)" >&2
  exit 1
fi

# ── build auth header ─────────────────────────────────────────────────────────
auth_header() {
  if [[ -n "$API_TOKEN" ]]; then
    echo "Authorization: Bearer $API_TOKEN"
  else
    local encoded
    encoded="$(printf '%s:%s' "$API_USER" "$API_PASS" | base64)"
    echo "Authorization: Basic $encoded"
  fi
}

# ── load locale files ─────────────────────────────────────────────────────────
for lang in en fr ru zh km es; do
  file="$LOCALE_DIR/${lang}.json"
  if [[ ! -f "$file" ]]; then
    echo "Warning: locale file not found: $file" >&2
  fi
done

# Merge all locale files into one object: { KEY: {en,fr,ru,zh,km} }
merged=$(jq -n \
  --slurpfile en  "$LOCALE_DIR/en.json" \
  --slurpfile fr  "$LOCALE_DIR/fr.json" \
  --slurpfile ru  "$LOCALE_DIR/ru.json" \
  --slurpfile zh  "$LOCALE_DIR/zh.json" \
  --slurpfile km  "$LOCALE_DIR/km.json" \
  --slurpfile es  "$LOCALE_DIR/es.json" \
  '
    $en[0] | keys_unsorted | reduce .[] as $k (
      {};
      . + { ($k): {
        en: ($en[0][$k] // ""),
        fr: ($fr[0][$k] // ""),
        ru: ($ru[0][$k] // ""),
        zh: ($zh[0][$k] // ""),
        km: ($km[0][$k] // ""),
        es: ($es[0][$k] // "")
      }}
    )
  '
)

# ── send entries ──────────────────────────────────────────────────────────────
AUTH_HDR="$(auth_header)"
total=$(echo "$merged" | jq 'length')
count=0
errors=0

echo "Syncing $total locale entries to $ENDPOINT"
[[ $DRY_RUN -eq 1 ]] && echo "(dry-run mode — no requests will be sent)"

while IFS= read -r key; do
  [[ -n "$FILTER_KEY" && "$key" != "$FILTER_KEY" ]] && continue

  translations=$(echo "$merged" | jq --arg k "$key" '.[$k]')
  payload=$(jq -n \
    --arg key_code  "$key" \
    --arg category  "$CATEGORY" \
    --argjson t     "$translations" \
    '{values: ({key_code: $key_code, category: $category} + $t)}'
  )

  count=$((count + 1))

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "[$count/$total] $key"
    echo "$payload" | jq -c .
    continue
  fi

  cookie_arg=()
  [[ -n "$API_COOKIE" ]] && cookie_arg=(-H "Cookie: session=$API_COOKIE; Secure; HttpOnly; SameSite=Strict")

  http_code=$(curl -s -o /tmp/locale_resp.json -w "%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HDR" \
    "${cookie_arg[@]}" \
    -d "$payload"
  )

  if [[ "$http_code" =~ ^2 ]]; then
    echo "[$count/$total] OK  $key"
  else
    echo "[$count/$total] ERR $key  (HTTP $http_code)" >&2
    cat /tmp/locale_resp.json >&2
    echo "" >&2
    errors=$((errors + 1))
  fi

done < <(echo "$merged" | jq -r 'keys_unsorted[]')

echo ""
echo "Done. $count entries processed, $errors error(s)."
[[ $errors -gt 0 ]] && exit 1 || exit 0
