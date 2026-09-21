# Backups

## Daily backups

Configure your Postgres host (Neon / Supabase / Railway) for daily automated backups.

## Restore drill (document when run)

1. Provision a scratch database from the latest backup snapshot.
2. Point `DATABASE_URL` at the scratch DB.
3. Run `pnpm db:generate && pnpm typecheck`.
4. Spot-check: institution count, student count for demo tenant, login with seed owner.
5. Record date, snapshot id, and outcome in this file.

| Date | Snapshot | Outcome | Operator |
|------|----------|---------|----------|
| — | — | Pending first drill | — |
