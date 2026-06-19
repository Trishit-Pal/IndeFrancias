---
description: Update docs/spec/SPEC.md (the mother book) to reflect the current code changes, with severity gating and validation.
---

Invoke the `frenchpath-spec-sync` skill and follow it exactly for the current git diff.

After syncing: report (1) the file→section mapping you used, (2) the sections you changed,
(3) the severity, and (4) the `npm run spec:validate` result. If any change is HIGH severity
(touches an invariant or ADR), STOP before editing and ask me for explicit sign-off.
