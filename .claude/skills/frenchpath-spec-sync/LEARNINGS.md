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
