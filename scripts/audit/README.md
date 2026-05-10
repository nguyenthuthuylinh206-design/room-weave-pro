# Audit Scripts

Sinh sự thật từ codebase + DB cho `docs/architecture/_generated/`.

## Cách chạy

```bash
# 1. Trích xuất từ codebase
node scripts/audit/extract-all.mjs

# 2. Dump schema từ DB (yêu cầu PG env vars)
bash /tmp/dump_schema.sh   # hoặc copy nội dung vào scripts/audit/dump-db-schema.sh

# 3. Sinh các catalog markdown
node scripts/audit/generate-catalogs.mjs
```

## Output

`docs/architecture/_generated/`:

- `routes.json` — 140 routes + guard + permission
- `rpc-calls.json` — 139 RPC × callers FE
- `table-usage.json` — 92 bảng × ops × files
- `edge-functions.json` — 28 functions + secrets
- `hooks.json` — 173 hooks × queryKeys × RPC × tables
- `pages.json` — 134 pages
- `migrations.json` — 357 migrations summary
- `db-columns.tsv`, `db-fks.tsv`, `db-policies.tsv`, `db-functions.tsv`, `db-triggers.tsv`, `db-rls-enabled.tsv` — DB facts

Re-run khi schema hoặc code thay đổi.
