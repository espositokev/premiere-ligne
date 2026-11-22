#!/usr/bin/env bash
# Lance les migrations et les tests SQL (pgTAP) sur un PostgreSQL local ordinaire,
# avec une émulation minimale de Supabase. Utile quand Docker n'est pas disponible.
# En CI, les mêmes tests tournent sur un vrai Supabase local (`supabase test db`).
#
# Usage : scripts/db-test-local.sh   (nécessite psql et l'extension pgtap)
set -euo pipefail

DB="${PL_TEST_DB:-premiere_ligne_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)
if [ "$(id -u)" = "0" ]; then PSQL=(su postgres -c "psql -v ON_ERROR_STOP=1 -q -X"); fi

run() { # run <db> <file>
  if [ "$(id -u)" = "0" ]; then su postgres -c "psql -v ON_ERROR_STOP=1 -q -X -d '$1' -f '$2'"; else psql -v ON_ERROR_STOP=1 -q -X -d "$1" -f "$2"; fi
}
sql() { # sql <db> <query>
  if [ "$(id -u)" = "0" ]; then su postgres -c "psql -v ON_ERROR_STOP=1 -q -X -d '$1' -c \"$2\""; else psql -v ON_ERROR_STOP=1 -q -X -d "$1" -c "$2"; fi
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; chmod 755 "$TMP"
cp -r "$ROOT/supabase/migrations" "$ROOT/supabase/tests" "$ROOT/tests/db/supabase-shim.sql" "$TMP/"
chmod -R a+r "$TMP"

sql postgres "drop database if exists $DB" >/dev/null
sql postgres "create database $DB" >/dev/null
run "$DB" "$TMP/supabase-shim.sql" >/dev/null

for f in "$TMP"/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  run "$DB" "$f" >/dev/null
done
if [ -f "$ROOT/supabase/seed.sql" ] && [ "${PL_WITH_SEED:-0}" = "1" ]; then
  cp "$ROOT/supabase/seed.sql" "$TMP/" && run "$DB" "$TMP/seed.sql" >/dev/null
fi

FAILED=0
for f in "$TMP"/tests/*.sql; do
  OUT="$(run "$DB" "$f" 2>&1 || true)"
  if echo "$OUT" | grep -qE "^\s*not ok|ERROR|Looks like you failed"; then
    echo "✗ $(basename "$f")"; echo "$OUT" | grep -E "not ok|ERROR|#" | head -40; FAILED=1
  else
    echo "✓ $(basename "$f") ($(echo "$OUT" | grep -cE '^\s*ok') vérifications)"
  fi
done
rm -rf "$TMP"
exit $FAILED
