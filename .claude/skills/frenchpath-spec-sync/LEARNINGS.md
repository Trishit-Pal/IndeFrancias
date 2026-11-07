# frenchpath-spec-sync — Learnings

> Append-only log of durable, repo-specific learnings discovered while syncing the spec.
> Folded into SKILL.md (with review) at milestone boundaries, then pruned.

- 2026-06-18 — Seeded. Capability Map is the file→section index; `data-testid`s in §4 mirror the
  e2e contract in `frenchpath/e2e/*` and `docs/testing.md`.
- 2026-06-19 — Bug fixes to shipped capabilities don't need §4 capability-map edits (status stays
  "shipped"). Only §8 roadmap + §11 revision log need updating. No capability status changes for
  correctness patches.
- 2026-06-19 — For large multi-commit branch diffs (26+ commits), spec-sync should focus on the
  NEW commits added on top of the branch (since last sync), not re-derive the original 26. Use
  `git log --oneline <last-synced-sha>..HEAD` to scope the diff.
- 2026-11-06 — docs/adr/ uses its own 000N numbering, which collides with the SPEC §7 inline ADR-1..7 index (ADR-6 = old UI). Adding an ADR file implies a §7 edit → HIGH, needs sign-off; decide numbering scheme before adding more.
- 2026-11-07 — §4 rows are safest patched by splitting the line on `|` and editing cells[4] (Key files) / cells[5] (Proof); the validator only resolves Key-file paths, so test ids and spec paths in Proof are free text. Shell a11y work that lives in `+layout.svelte` has no Capability row: log it in §11 as "strengthens invariant 6" rather than inventing a row. A UI-only pass over many routes maps to many rows but is still MEDIUM when no invariant/ADR text changes.
