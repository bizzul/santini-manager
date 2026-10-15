#!/usr/bin/env bash
# Avvia il test ore a due finestre contro Supabase locale.
# Non stampa le chiavi. Rifiuta il progetto di produzione.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v supabase >/dev/null 2>&1; then
  echo "CLI supabase assente." >&2
  exit 1
fi

status_env="$(supabase status -o env | grep -E '^[A-Za-z_][A-Za-z0-9_]*=' || true)"
if [[ -z "$status_env" ]]; then
  echo "supabase status non ha restituito variabili." >&2
  exit 1
fi
eval "$status_env"

api_url="${API_URL:-}"
anon_key="${ANON_KEY:-}"
service_key="${SERVICE_ROLE_KEY:-}"

if [[ -z "$api_url" || -z "$anon_key" || -z "$service_key" ]]; then
  echo "supabase status non ha restituito API_URL, ANON_KEY e SERVICE_ROLE_KEY." >&2
  exit 1
fi

if [[ "$api_url" == *jzxffusiwtrvjwmpjztu* ]]; then
  echo "Rifiutato: URL di produzione." >&2
  exit 1
fi

if [[ "$api_url" != http://127.0.0.1:* && "$api_url" != http://localhost:* ]]; then
  echo "Rifiutato: Supabase non è locale." >&2
  exit 1
fi

export NEXT_PUBLIC_SUPABASE_URL="$api_url"
export STORAGE_SUPABASE_URL="$api_url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key"
export STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key"
export STORAGE_SUPABASE_SERVICE_ROLE_KEY="$service_key"
export NEXT_PUBLIC_ROOT_DOMAIN="localhost"

repeats="${ZZTEST_REPEAT:-2}"
exec npx playwright test --config playwright.config.ts --repeat-each="$repeats"
