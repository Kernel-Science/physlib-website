# Monthly updates

Auto-generated per-month diff summaries for
[`leanprover-community/physlib`](https://github.com/leanprover-community/physlib).

Each `YYYY-MM.json` file in this directory is produced by
[`../../scripts/generate-monthly-updates.js`](../../scripts/generate-monthly-updates.js),
which is run:

- Automatically on the 1st of every month by the
  [`monthly-updates.yml`](../../../.github/workflows/monthly-updates.yml)
  GitHub Actions workflow (targets the previous month).
- Manually via `workflow_dispatch` (with an optional `month` or `backfill`
  input) on the same workflow.
- Locally with:

  ```sh
  cd web2
  # last completed month
  GITHUB_TOKEN=... node scripts/generate-monthly-updates.js
  # a specific month
  GITHUB_TOKEN=... node scripts/generate-monthly-updates.js --month 2026-06
  # backfill the last N months
  GITHUB_TOKEN=... node scripts/generate-monthly-updates.js --backfill 6
  # overwrite existing files
  GITHUB_TOKEN=... node scripts/generate-monthly-updates.js --month 2026-06 --force
  ```

Each JSON file drives the `/monthly-updates` listing table and its
per-month `/monthly-updates/<slug>` docs-style detail page.
