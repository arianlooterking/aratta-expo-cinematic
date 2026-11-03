#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres database and runs the
# SQL access-control tests. Usage: PGHOST=... PGPORT=... PGUSER=... scripts/db-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="aratta_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT
run() { psql -v ON_ERROR_STOP=1 -q -X -o /dev/null -d "$DB" "$@"; }
run -f supabase/tests/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  echo "migrate: $f"
  run -f "$f"
done
for f in supabase/tests/*.test.sql; do
  echo "test: $f"
  run -f "$f"
done
echo "database tests passed"
