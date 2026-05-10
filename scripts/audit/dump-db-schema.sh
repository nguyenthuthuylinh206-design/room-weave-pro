#!/usr/bin/env bash
# Dump schema từ Postgres → docs/architecture/_generated/db-*.tsv
# Cần PG env vars (PGHOST, PGUSER, PGDATABASE, PGPASSWORD).
set -euo pipefail
OUT=docs/architecture/_generated
mkdir -p "$OUT"

psql -At -F $'\t' -c "
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_schema='public'
ORDER BY table_name, ordinal_position;" > "$OUT/db-columns.tsv"

psql -At -F $'\t' -c "
SELECT conrelid::regclass::text, a.attname, confrelid::regclass::text, af.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
JOIN pg_attribute af ON af.attrelid=c.confrelid AND af.attnum=ANY(c.confkey)
WHERE c.contype='f' AND connamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
ORDER BY 1;" > "$OUT/db-fks.tsv"

psql -At -F $'\t' -c "
SELECT schemaname, tablename, policyname, cmd, roles::text, qual, with_check
FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;" > "$OUT/db-policies.tsv"

psql -At -F $'\t' -c "
SELECT p.proname, pg_get_function_arguments(p.oid), pg_get_function_result(p.oid),
       l.lanname, p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' ORDER BY p.proname;" > "$OUT/db-functions.tsv"

psql -At -F $'\t' -c "
SELECT event_object_table, trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers WHERE trigger_schema='public'
ORDER BY event_object_table, trigger_name;" > "$OUT/db-triggers.tsv"

psql -At -F $'\t' -c "
SELECT c.relname, c.relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;" > "$OUT/db-rls-enabled.tsv"

echo "Done → $OUT"
wc -l "$OUT"/db-*.tsv
