# badir-core-web — Data Migration Plan

> This document covers the **two data migrations** that the [MIGRATION_PLAN.md](../MIGRATION_PLAN.md)
> (§13, item 4) flagged as out of scope for the platform swap: moving bytes out of Supabase
> Storage into Cloudflare R2, and moving rows out of Supabase Postgres into our self-hosted
> `postgres:18-alpine`.
>
> Both migrations are independent: storage can cut over first, or last, or in the same window
> as the database. They are sequenced here with database first because storage URLs in the
> database are rewritten after the database is live, so doing them in this order lets the
> application keep serving traffic throughout.
>
> Neither of these changes a single line of application code. The runtime uses the
> `services/storage.ts` S3 client (R2-compatible) and Prisma talking to whatever
> `DATABASE_URL` points at. Once the data lands at its new home and `DATABASE_URL` /
> `S3_ENDPOINT` / `S3_PUBLIC_URL` are flipped in `.env`, the same container image serves
> reads and writes against the new backend with no code change.

---

## 1. Scope

| Asset               | Source                       | Target                                          | Volume estimate                                    |
| ------------------- | ---------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Object storage      | Supabase Storage (3 buckets) | Cloudflare R2 (1 bucket, 3 prefixes)            | measured on day-of (script in §3.1 below)          |
| Relational database | Supabase Postgres            | `postgres:18-alpine` (local compose)            | measured on day-of (script in §4.1 below)          |
| Auth identities     | Supabase Auth                | better-auth + same Postgres                     | **no migration** — better-auth is already live     |
| Realtime            | Supabase Realtime channels   | n/a                                             | **no migration** — code doesn't use Realtime       |
| Edge Functions      | Supabase Edge Functions      | n/a                                             | **no migration** — code doesn't use Edge Functions |
| Row-Level Security  | Supabase RLS policies        | Prisma-level auth checks (`lib/permissions.ts`) | **already migrated** in earlier work               |

The application uses **none** of Supabase Auth, Realtime, Edge Functions, or RLS — auth runs
through better-auth against the same Postgres, authorization runs through `lib/permissions.ts`
on the Node side. So the only thing to physically move is the storage bytes and the database
rows.

---

## 2. Tools — what "the popular solution" actually means

| Asset               | Tool chosen                                      | Why                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Object storage      | **`rclone`**                                     | Single binary that talks to S3, S3-compatible (R2), and Supabase Storage's S3-compatible gateway with one config. Streams large files without buffering. Maintained since 2013, ~50k GitHub stars.   |
| Relational database | **`pg_dump` + `pg_restore`** (PostgreSQL native) | Ships with every Postgres install, no extra binary, handles schema + data + ACLs in one go. R2 has no peer for live migration _without_ downtime; pg_restore is the canonical short-window solution. |

We deliberately do **not** use:

- **Supabase CLI `db pull`** — only emits schema, not data. We need both.
- **`pgloader`** — popular, but its MySQL/Oracle heritage shows in the type mapping; on a
  Postgres→Postgres job it adds an extra dependency and a second class of edge cases for no
  win over the native tools.
- **`Logical Replication`** (publication/subscription) — would let us run a continuous sync,
  but Supabase exposes the `postgres` role without `REPLICATION` privileges and granting
  them is an org-tier request that we don't want to block on.
- **Third-party SaaS** (Stitch, Fivetran, Airbyte) — adds an attack surface and a paid
  subscription for a one-shot job.

---

## 3. Storage migration — Supabase Storage → Cloudflare R2

### 3.1 Pre-flight inventory

Run on a maintenance window day-of. Reads from Supabase; nothing is written.

```bash
# Set in the current shell:
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SERVICE_KEY="<service-role-key>"
export R2_ENDPOINT="https://<account>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="<r2-token-id>"
export R2_SECRET_ACCESS_KEY="<r2-token-secret>"

# Per-bucket object count and total bytes
for bucket in avatars documents post-images; do
  count=$(curl -sS "${SUPABASE_URL}/storage/v1/object/list/${bucket}?prefix=" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    | jq 'length')
  echo "  ${bucket}: ${count} top-level keys (drill down with recursive list if > 1000)"
done
```

If the count looks off, paginate with Supabase's `?limit=1000&offset=…&sortBy=name` params.

### 3.2 Provision R2

In the Cloudflare dashboard, **once**:

1. Create the R2 bucket `badir` (one bucket, prefix per logical bucket — matches §4 of
   [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) and how `services/storage.ts` reads).
2. Generate an R2 API token with **Object Read & Write** scoped to `badir`.
3. Decide on a public-read strategy:
   - **Option A (recommended):** R2 public bucket + custom domain `cdn.badir.example.com`
     pointed at the bucket. `S3_PUBLIC_URL=https://cdn.badir.example.com` in `.env`.
     R2 serves via the bucket's public dev URL (`*.r2.dev`) until the custom domain
     propagates, so we can swap `S3_PUBLIC_URL` later without re-uploading.
   - **Option B:** Private bucket + signed URLs. Adds latency and a signature step in the
     helper; skip unless the security posture requires it.

4. Cross-Region Restrictions: enable only the regions the app actually serves from; not
   strictly necessary for correctness, just cost.

### 3.3 Configure rclone

Create a non-checked-in config at `~/.config/rclone/rclone.conf` (or pass inline):

```ini
[supabase]
type = s3
provider = Other
endpoint = https://<ref>.supabase.co/storage/v1/s3
access_key_id = <project-ref>
secret_access_key = <supabase-s3-access-key>
force_path_style = true
no_check_bucket = true

[r2]
type = s3
provider = Cloudflare
endpoint = https://<account>.r2.cloudflarestorage.com
access_key_id = <r2-token-id>
secret_access_key = <r2-token-secret>
no_check_bucket = true
```

Supabase exposes a hidden S3-compatible gateway at `/storage/v1/s3`; you need to generate
a separate S3 access key in the Supabase dashboard (Settings → API → S3 access keys) — the
anon/service-role JWT does not work here.

### 3.4 The copy (zero-downtime, idempotent)

```bash
set -euo pipefail

DRY_RUN=1   # flip to 0 to commit the copy

for prefix in avatars documents post-images; do
  rclone copy \
    "supabase:${prefix}" \
    "r2:badir/${prefix}" \
    --transfers 32 \
    --checkers 64 \
    --s3-upload-cutoff 50Mi \
    --s3-chunk-size 50Mi \
    --s3-disable-checksum \
    --retries 5 \
    --retries-sleep 10s \
    --stats 30s \
    --stats-one-line \
    --log-file "/tmp/rclone-${prefix}.log" \
    --log-level INFO \
    $( [ "$DRY_RUN" = 1 ] && echo "--dry-run" )
done
```

Notes:

- `--s3-disable-checksum` — Supabase's gateway serves the wrong checksum on some object
  sizes; without this flag rclone spends all its time on re-checks. We trust the byte-level
  copy and verify by count + size on R2 separately.
- The `--dry-run` first pass gives a real ETA and catches credential / endpoint problems
  before we touch anything.
- rclone is **idempotent** by default (size + mtime check), so re-running is safe and cheap.

### 3.5 Verify

```bash
# Compare top-level key counts
for prefix in avatars documents post-images; do
  src=$(rclone lsjson "supabase:${prefix}" --no-modtime | jq 'length')
  dst=$(rclone lsjson "r2:badir/${prefix}" --no-modtime | jq 'length')
  printf "%-15s src=%s  dst=%s  match=%s\n" "$prefix" "$src" "$dst" "$([ "$src" = "$dst" ] && echo OK || echo MISMATCH)"
done

# Spot-check a known avatar
curl -fsSI "https://cdn.badir.example.com/avatars/<known-user-id>/<known-file>.jpg" \
  | head -3
```

Compare _size totals_ too, not just counts (`rclone size supabase:avatars` /
`rclone size r2:badir/avatars`). A 1-byte mismatch on a hundred files is the classic
"checksum-disabled copy" failure mode and will only show up on byte totals.

### 3.6 Rewrite the database URLs

DB rows still point at the Supabase URLs (the ones `extractStoragePath` already strips the
bucket from — see `services/storage.ts:96`). We rewrite the URL _and_ keep `extractStoragePath`
as a fallback for any row we miss.

```sql
-- preview before commit:
SELECT count(*)
FROM "User"
WHERE "image" LIKE '%supabase.co/storage/v1/object/public/avatars%';

UPDATE "User"
SET "image" = replace(
  "image",
  'https://<ref>.supabase.co/storage/v1/object/public/avatars/',
  'https://cdn.badir.example.com/avatars/'
)
WHERE "image" LIKE '%supabase.co/storage/v1/object/public/avatars%';

-- repeat the same UPDATE shape for every table+column that holds a Supabase URL.
-- Known tables (per the codebase):
--   User.image                          → avatars/
--   Organization.logo, Organization.documents  → documents/, post-images/
--   Initiative.coverImage               → post-images/
--   Post.images (json array)            → post-images/
--   document_links.url                  → documents/
```

Run inside a single transaction; if the count doesn't match the preview row-count after the
UPDATE, roll back and investigate before re-running. The application uses
`extractStoragePath` on every read (`services/storage.ts:96`), so legacy URLs keep working
until the rewrite commits — there's no race where a row would be in a bad state.

### 3.7 Cut over and keep Supabase alive

1. Flip `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`,
   `S3_PUBLIC_URL` in `.env` on dev1 / staging1 / prod.
2. Restart the app container(s).
3. Smoke-test: pick three random existing avatars and three post images from the admin UI,
   confirm the served URL is now `cdn.badir.example.com/…` and that the bytes resolve.
4. **Do not** delete the Supabase project for **30 days**. `extractStoragePath` handles
   legacy URLs, but a typo in the cutover, a stale CDN cache, or a new R2 region outage all
   want a one-click rollback. The Supabase free tier stays frozen under $0 of traffic once
   we stop serving new objects.
5. After 30 days, terminate the Supabase project. At that point `extractStoragePath`'s
   `/storage/v1/object/public/` regex branch can stay (it costs nothing and protects against
   any stray bookmark in a user's browser).

### 3.8 Failure modes & rollback

| Failure                                | Recovery                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R2 credentials wrong                   | `rclone copy` fails fast in `--dry-run`; fix token and re-run.                                                                                                           |
| Object count / size mismatch on verify | Re-run `rclone copy` — idempotent. If still mismatched, the difference is one specific object's size (rare); `rclone copy --checksum` forces a byte compare but is slow. |
| App serves a 404 after cutover         | Check `S3_PUBLIC_URL` first (most common — CDN DNS not yet propagated, or wrong bucket name in the URL). Then check the URL-rewrite transaction committed.               |
| Cutover reveals a stale Supabase URL   | The `extractStoragePath` legacy branch serves it from Supabase (still alive). Re-run the UPDATE for the missed column.                                                   |
| Want to abort the cutover entirely     | Revert `.env` (no app restart needed if S3_ENDPOINT was the only change); image URLs in the DB still work because they still match Supabase Storage.                     |

---

## 4. Database migration — Supabase Postgres → self-hosted `postgres:18-alpine`

### 4.1 Pre-flight inventory

```bash
# Connection string from Supabase dashboard (Settings → Database → Connection string → Direct).
# The pooler string (port 6543, pgbouncer in front) won't work for pg_dump — use the direct one.
export SOURCE_DB="postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# Server version
psql "$SOURCE_DB" -c 'SHOW server_version;'

# Database size
psql "$SOURCE_DB" -c "SELECT pg_size_pretty(sum(pg_database_size(oid))) FROM pg_database;"

# Largest tables
psql "$SOURCE_DB" -c "
  SELECT schemaname || '.' || relname AS table,
         pg_size_pretty(pg_total_relation_size(relid)) AS size,
         n_live_tup AS rows
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 20;
"

# Active connections (close anything that holds long locks: dashboards, CRON, Edge Functions)
psql "$SOURCE_DB" -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

### 4.2 Pre-flight: dump schema and data separately (recommended)

Why not `pg_dump` the whole thing in one shot? Because we want to **validate the schema
first** in an empty local Postgres — `pg_restore` will tell us if any extension or role is
missing, and we'd rather find that out on an empty database than 800 MB into the data
restore.

```bash
mkdir -p /tmp/dbdump && cd /tmp/dbdump

# Schema only. --no-owner --no-privileges so the dump can be restored into a fresh
# role without permissions errors. --clean so we can re-apply on top of a partial restore.
pg_dump "$SOURCE_DB" \
  --schema-only \
  --no-owner --no-privileges \
  --format=custom \
  --file=schema.dump

# Data only. --column-inserts is much slower than COPY but produces a dump that's robust
# to column-order changes between Supabase versions. Acceptable here because the data is
# small enough; if any single table exceeds 1 GB, switch back to plain COPY for that table.
pg_dump "$SOURCE_DB" \
  --data-only \
  --no-owner --no-privileges \
  --column-inserts \
  --format=custom \
  --file=data.dump
```

If the dump volume is large enough that `--column-inserts` becomes painful (>30 minutes),
split the data dump per-schema or per-table:

```bash
pg_dump "$SOURCE_DB" --data-only --no-owner --column-inserts \
  --table=public.\"User\" --table=public.\"Organization\" … --file=data.dump
```

Or just fall back to `--format=plain` and pipe through `gzip` (smaller, faster restore than
custom format for the data-only case):

```bash
pg_dump "$SOURCE_DB" --data-only --no-owner --column-inserts \
  | gzip -9 > data.sql.gz
```

### 4.3 Bring up the local Postgres

Use the same compose service the application talks to, but a fresh volume, so we know we
start from zero.

```bash
# In the project root, with the compose stack down:
cd /home/u6f/projects/algeriantechmakers/badir/badir-core-web

docker compose down   # if it was running

# Replace the data volume
docker volume rm badir_pgdata

# Bring up db + minio-init + migrate so the schema Prisma expects gets applied…
docker compose up -d db migrate minio-init
# …and wait for migrate to finish (exits 0 on success).
docker compose ps migrate
```

The `migrate` service in `docker-compose.yml` runs `prisma migrate deploy` against the empty
database, producing the schema Prisma expects. **This is the schema we compare against.**

### 4.4 Sanity-check schema compatibility

```bash
# Pull Prisma's view of the schema
docker compose exec db pg_dump -U "$DB_USER" -d "$DB_NAME" --schema-only --no-owner \
  > /tmp/prisma-schema.sql

# And the dump from Supabase
pg_dump "$SOURCE_DB" --schema-only --no-owner > /tmp/source-schema.sql

# Schema diff (lines that exist in either but not both — most will be Supabase's auth/storage schemas)
diff <(sort -u /tmp/prisma-schema.sql) <(sort -u /tmp/source-schema.sql) \
  | head -200
```

Expected diffs:

- `storage.*` schema (Supabase Storage's bookkeeping tables — irrelevant)
- `auth.*` schema (Supabase Auth's bookkeeping — irrelevant; better-auth uses its own tables)
- `realtime.*`, `supabase_migrations.*` (Supabase-only)
- `extensions.*` (Supabase's `pg_stat_statements` views)

Anything that references a public-schema table (e.g. a Supabase RLS policy that survived in
the dump) is a real diff. RLS policies should be stripped from the schema-only dump
automatically because we don't dump policies on tables we're not dumping — but verify
with the diff.

### 4.5 Restore the data

```bash
# Restore schema first (idempotent: --clean drops everything before recreating)
pg_restore --dbname="$TARGET_DB" --clean --if-exists --no-owner --no-privileges \
  --schema-only /tmp/dbdump/schema.dump

# Then data
pg_restore --dbname="$TARGET_DB" --no-owner --no-privileges \
  --data-only /tmp/dbdump/data.dump
```

If `pg_restore` fails partway through, the error tells you which table. Two common causes:

1. **Order-of-restore + foreign-key violations.** `pg_restore --data-only` with
   `--column-inserts` restores tables in alphabetical order by default, which rarely matches
   FK order. The fix is `--jobs=4 --use-list=<(awk …)` or, more pragmatically, single-threaded
   restore in dependency order:
   ```bash
   # Example: tables with no FKs first
   for t in \"User\" \"Organization\" \"Initiative\" \"Post\"; do
     pg_restore --dbname="$TARGET_DB" --no-owner --data-only \
       --table=public."$t" /tmp/dbdump/data.dump
   done
   ```
2. **Sequence out of sync.** After data restore, sequences are still at 1. Without fix, the
   next `INSERT` will collide with an existing id. Fix:
   ```sql
   -- Run on the target DB; Prisma's id columns are CUID by default but
   -- some tables (Participation, Consent, etc.) use serial/sequence PKs.
   SELECT 'SELECT setval(''' || sequence_name || ''', COALESCE((SELECT MAX(' ||
          substring(sequence_name from 1 for length(sequence_name)-11) || '_id) FROM public.' ||
          table_name || '), 1));'
   FROM information_schema.sequences
   WHERE sequence_schema = 'public';
   ```
   Paste the resulting statements into `psql` and run them. Or do it table-by-table with
   `pg_get_serial_sequence`.

### 4.6 Verify

```sql
-- 1. Row counts: every public table should match Supabase's pg_stat_user_tables.
SELECT relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- 2. Foreign-key integrity: a failed check means a row refers to a parent that
--    didn't restore (or restored in the wrong order).
SELECT conname,
       (SELECT count(*) FROM pg_constraint WHERE conname = c.conname) AS present,
       confdeltype, confupdtype
FROM pg_constraint c
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY conname;

-- 3. Quick application smoke-test: log in as the seeded admin, list 10 organizations,
--    open 1 initiative detail. These hit paths that exercise FKs, joins, and our
--    cache tags.
```

The application's own CI (`pnpm run type-check`, `next build`) does not validate database
state, so the SQL checks above are the only verification — script them in
`scripts/verify-migration.sql` (committed next to the migration script) so the next person
can re-run them.

### 4.7 Cut over

The application reads `DATABASE_URL` and `DIRECT_URL` from `.env`. Both currently point at
Supabase:

```bash
# In .env
DATABASE_URL=postgresql://badir:badir@db:5432/badir      # was Supabase pooler
DIRECT_URL=postgresql://badir:badir@db:5432/badir        # was Supabase direct
```

To cut over:

1. Stop the `app` service (`docker compose stop app`) — leaves the `db` volume online, no
   new connections to the old database.
2. Update `.env` with the new connection strings.
3. Restart (`docker compose up -d app`).
4. Smoke-test from the admin UI.

For zero-downtime, run the two databases side by side for a short window: keep Supabase
read-only (point the Supabase project at "freeze"), point `DATABASE_URL` at the new
`db:5432`, and watch the error rate. If anything looks off, point `DATABASE_URL` back at
Supabase — better-auth + Prisma are happy either way.

### 4.8 Decommission Supabase

Same 30-day window as storage. After 30 days of clean traffic against the local database:

1. Export the final state of Supabase once more and stash in cold storage (S3 of course).
2. Delete the Supabase project from the dashboard.
3. Remove the `extractStoragePath` legacy-URL branch (only if you also decommissioned
   Cloudflare R2 from the storage side; otherwise leave it).

### 4.9 Failure modes & rollback

| Failure                        | Recovery                                                                                                                                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `pg_restore` fails on schema   | The diff in §4.4 will show exactly what's missing — usually an extension. `CREATE EXTENSION IF NOT EXISTS` it, retry.                                                                                                                                                                                         |
| Data restore hits FK violation | Identify the offending table (`pg_restore --list data.dump                                                                                                                                                                                                                                                    | grep …`), restore it last, then `setval` its sequences. |
| Sequence out of sync           | Run the `setval` script in §4.5. Always run it; never skip.                                                                                                                                                                                                                                                   |
| Cutover reveals a missing row  | The application reads stale-by-default from `unstable_cache` for ~30 minutes on `organizations`, ~24 h on `stats`. Force a refetch: `docker compose exec app curl -X POST http://localhost:3000/api/cron/inactive-users -H "Authorization: Bearer $CRON_SECRET"` (any cron route triggers Next's cache bust). |
| Want to abort cutover entirely | Revert `.env` `DATABASE_URL` to the Supabase pooler; the app reconnects within the pooler's idle window (typically <60 s).                                                                                                                                                                                    |

---

## 5. Sequencing and the combined cutover

The cleanest order is **database first, storage second, both within a single 30-minute
maintenance window**:

1. T-0:00 — Inventory (§3.1, §4.1) — read-only.
2. T-0:10 — Provision R2 (§3.2). Schedule the database dump (§4.2) to run continuously
   into a holding area so the live cutover window is just a `pg_restore`.
3. T-0:20 — `pg_dump` + `pg_restore` (§4.2–4.5). The application is still up, talking to
   Supabase.
4. T-0:25 — `rclone copy` (§3.4). Dry-run first (5 min), real run (10–20 min depending on
   volume).
5. T-0:45 — Verify both sides (§3.5, §4.6). If anything fails, fix it; the window stretches
   but no rollback is needed yet.
6. T-0:50 — Flip `DATABASE_URL` + `S3_*` in `.env`, restart `app`, smoke-test (§3.7, §4.7).
7. T-0:55 — Hand back to users.
8. T+30 days — Decommission Supabase.

If the maintenance window can't stretch, split it: storage on Wednesday, database on
Sunday. The application supports them independently because `extractStoragePath` falls back
to legacy Supabase URLs and Prisma points at whatever `DATABASE_URL` is.

---

## 6. Tooling checks (do these once, before the day)

```bash
# pg_dump + pg_restore must match the source server's major version.
# Source is Supabase Postgres (current major: 16 or 17 at time of writing).
# Target is postgres:18-alpine, which ships pg_dump 18.
# pg_dump can read from older servers but produces dumps that the older server
# cannot read back. Restoring a 16 dump into 18 is fine. The reverse is not.

# Validate rclone version (≥ 1.65 has the --s3-disable-checksum flag we use)
rclone version | head -3

# Validate pg_dump / pg_restore against a known Supabase-shaped schema
docker run --rm postgres:18-alpine pg_dump --version
docker run --rm postgres:18-alpine pg_restore --version
```

---

## 7. Open items (raised by this plan)

1. **CDN behind R2.** A custom domain (`cdn.badir.example.com`) on the R2 bucket is the
   cheapest way to get a stable `S3_PUBLIC_URL`. Decision deferred until we know whether the
   R2 free-egress tier (10 GB / month free, then $0.015/GB) covers the project's image
   volume. If it doesn't, swap to Cloudflare Images or BunnyCDN in front of R2 — no code
   change required, only `S3_PUBLIC_URL` in `.env`.

2. **better-auth schema migration.** better-auth currently uses Supabase Postgres. After the
   database cutover, the same Postgres instance serves better-auth (no schema change). If
   we later move better-auth to its own Postgres (e.g., for blast-radius isolation), that's
   another `pg_dump`/`pg_restore` job on a smaller dataset.

3. **Connection pooling.** `docker-compose.yml` runs Postgres without PgBouncer. fine for
   dev/staging/single-instance prod. If prod moves behind multiple app instances, add a
   PgBouncer service in front of `db` and switch `DATABASE_URL` (only) to the pooler.

4. **Backups.** The local Postgres needs its own backup strategy now that Supabase isn't
   doing it for us. Either a sidecar running `pg_dump` nightly into R2, or a filesystem
   snapshot of the `badir_pgdata` volume. Track as a follow-up ticket.

---

## 8. Scripts directory (to be created in the same PR as this plan lands)

```
scripts/
├── storage-migration/
│   ├── inventory.sh         # §3.1
│   ├── rclone-copy.sh       # §3.4 (supports --dry-run)
│   └── verify-counts.sh     # §3.5
└── db-migration/
    ├── dump-schema.sh       # §4.2 (schema only)
    ├── dump-data.sh         # §4.2 (data only)
    ├── restore.sh           # §4.5
    ├── setval-sequences.sql # §4.5 fix
    └── verify.sql           # §4.6 row-count + FK checks
```

Each script runs in a sandboxed mode (read-only, dry-run) by default, takes its inputs from
environment variables, and never writes to a path outside the working directory. This means
the team can rehearse the cutover end-to-end against a throwaway project before doing it for
real.
