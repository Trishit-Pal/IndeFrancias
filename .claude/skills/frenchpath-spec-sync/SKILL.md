---
name: frenchpath-spec-sync
description: Use as the final Definition-of-Done step after finishing a FrenchPath feature, or on demand, to update docs/spec/SPEC.md to reflect code changes. Reads the git diff, patches only affected sections, gates invariant/ADR edits behind human sign-off, logs every change.
---

# FrenchPath Spec Sync

Keep `docs/spec/SPEC.md` (the mother book) accurate after code changes — surgically and cheaply.

## When to use

- The last step of finishing a feature (Definition of Done), or when the user runs `/spec-sync`.
- NOT for trivial diffs that change no capability, behaviour, architecture, or roadmap — say so and stop.

## Procedure

1. **Get the diff.** `git diff --stat` and `git diff` for the working tree (or `git diff <base>...HEAD` on a branch). If empty, report "no changes" and stop.
2. **Map files → sections.** For each changed path, find the §4 Capability Map row whose Key files contain it. A changed file with no row may be a NEW capability (add a row) or internal-only (skip). List your file→section mapping before editing.
3. **Classify severity (see §10 of SPEC.md):**
   - **HIGH** — diff touches anything described by §3 Invariants or §7 ADRs (e.g., adds a network call, an account, runtime AI, weakens CSP, changes an ADR). **STOP. Do not edit those sections. Summarise the conflict and ask the user for explicit sign-off** before proceeding.
   - **MEDIUM** — new/changed capability or roadmap item (§4/§8). Patch the affected section(s) only.
   - **LOW** — wording/glossary. Patch + log.
4. **Patch surgically.** Edit only the mapped sections. Preserve every other line. Keep Capability Map columns intact; update `Status`/`Key files`/`Proof` as the diff dictates.
5. **Log.** Append one row to §11 Revision log: `| <date> | <one-line summary> | <sections> | <severity> |`. Use the date the user/runtime provides; never invent one.
6. **Validate.** Run `npm run spec:validate` from `frenchpath/`. If it fails, fix the anchors you wrote. Then report the sections changed.

## Token economy (mandatory)

- Read the diff and the affected SPEC.md sections only — **never re-read the whole codebase.**
- Default to patching inline in the current context.
- **Escalate to a `doc-updater` subagent ONLY** when the diff is large/milestone-sized (a new domain or route, a new capability, or many files across domains). Pass the subagent the diff + the relevant SPEC.md sections, not the repo.

## Knowledge accrual

When you learn something durable about this repo while syncing (a recurring mapping, a gotcha),
append a dated bullet to `LEARNINGS.md` in this skill folder. Do NOT rewrite this SKILL.md inline —
durable learnings are folded in (with review) at milestone boundaries, then pruned from LEARNINGS.

## Red flags (stop and ask)

- The diff weakens an invariant (adds network/account/runtime-AI, loosens CSP). → HIGH, sign-off required.
- You can't map a change to any section and it clearly affects behaviour. → ask the user where it belongs.
- `spec:validate` fails after your edit and you can't see why. → report, don't force.
