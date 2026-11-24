# External Lean Declaration Audit

The database indexes Lean source declarations at pinned Git revisions. Each row carries a repository, file, line, Lean keyword and qualified source name. A source receipt checks each file against its upstream Git blob. Source-level `sorry` and `admit` flags describe the declaration text. The audit does not run the Lean compiler.

Extract the portable snapshot from this directory with `gzip -dc declarations.sqlite.gz > declarations.sqlite` in a fresh checkout. The local working database is `declarations.sqlite`.

To read every declaration from one repository, including its proposed Physlib-style destination, open the database with SQLite and run this query.

```sql
SELECT d.path, d.line, d.name, d.kind, d.status,
       coalesce(dp.public_topic, mp.public_topic) AS roadmap_folder,
       coalesce(dp.topic, mp.topic) AS scientific_topic,
       coalesce(dp.evidence, mp.evidence) AS placement_evidence
FROM roadmap_external_declarations AS d
JOIN module_placements AS mp ON mp.module_id = d.module_id
LEFT JOIN declaration_placements AS dp ON dp.declaration_id = d.decl_id
WHERE d.repository = 'yezhuoyang/LogicQ'
ORDER BY d.path, d.line;
```

The roadmap uses two glyphs for Physlib and PhyslibAlpha declarations. Lemmas, theorems and axioms use a filled dot. Definitions, constants and other object declarations use an eight-spoke asterisk. A native file region opens its published on-site Docs page. Marks share the file destination. Anonymous Lean examples remain in the audit table. Hollow circles come from explicit TODOs in Physlib Wiki articles.

To rebuild from the pinned project inventories, run these commands in `web2`. The source audit resumes completed files and verifies their Git blobs at the end of a full run. After a scoped `--repo` run, use `python3 scripts/roadmap_verify_blobs.py --db /path/to/candidate.sqlite` to verify the completed projects. Verification reads public Git trees through an authenticated GitHub CLI or a `GITHUB_TOKEN` with public repository read access.

```sh
python3 scripts/roadmap_audit.py
python3 scripts/roadmap_placement.py
node scripts/build-roadmap-native-folders.mjs
python3 scripts/build-roadmap-native-declarations.py
python3 scripts/export-roadmap-declarations.py --complete
node scripts/build-verso-roadmap.mjs
```

The approved project inventory lives in `project-review.json`. Each entry links its README and a representative source file to one native folder. The map places that file at the reviewed home and uses that home as the default for its project. Explicit native subject trees, independently registered subject scopes and more specific native subfolders can place other contributions elsewhere. SQLite retains both the detailed source classification and the published folder. A complete export checks the review against the registered revisions, file inventories, verified sources and populated project homes before switching the public index.

The overview draws individual declarations for Physlib and PhyslibAlpha. External declarations contribute to grey project and topic areas. Select a named project on the map and use **Open on GitHub** to visit its repository. The SQL query above lists its indexed declarations, source files and lines.

The area for a repository is its indexed declaration count times its linked GitHub contributor count raised to the power 1.1. Each repository divides that area among its topics in proportion to its declaration counts. Physlib and PhyslibAlpha share one repository. The blue Physlib total includes bundled QuantumInfo. Each native file in the pinned Git tree is indexed, including import-only files. Marks count explicit formal declaration commands in the source. Each native declaration retains its source line at the pinned Git revision. Explicit TODOs in Wiki articles occupy part of the native repository’s area without adding to its declaration count. Source visibility controls leave the geometry fixed.

The weekly workflow refreshes native file and folder credits when the pinned Physlib revision changes. To reproduce them locally, use an authenticated GitHub CLI and run `python3 scripts/build-roadmap-native-contributors.py --repo /path/to/full/physlib/clone`. Refresh the separate repository-wide contributor snapshot with `node scripts/build-roadmap-contributors.mjs`. GitHub attributes commits to linked accounts. The snapshot excludes reported bots and records when the contributor lists were fetched.

### Maintaining the external audit

On the first Monday of each month and on manual dispatch, **Generate API map** lists changed external repositories in its Actions job summary. Each comparison starts at the revision in a published file inventory. Projects with multiple pins have a comparison for each older pin. Unavailable repositories and inventory discrepancies are listed separately. Run `node scripts/check-external-roadmap-heads.mjs` with an authenticated GitHub CLI to see the same report locally.

**Maintainer TODO.** Review each comparison for changes to the registered Lean paths. When updating a project, review its proposed native folder and refresh the pinned source citation in `project-review.json`. Preserve its subject scopes in `scripts/roadmap-project-registry.json` and run `node scripts/build-verso-roadmap.mjs` in a separate checkout to generate candidate inventories. Use a fresh working SQLite database. For an initial check of one repository, `python3 scripts/roadmap_audit.py --repo OWNER/REPO --db /path/to/candidate.sqlite` limits source ingestion to that project. Before replacing the published snapshot, complete the full rebuild above and review the verified file and declaration counts by project. Keep the existing portable database and published inventories until the candidate passes. Refresh the separate repository contributor counts when reviewing external updates so the area weights carry a current observation date.
