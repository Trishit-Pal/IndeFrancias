# ADR-9: Sync merge keeps earned progress

**Status:** Accepted
**Date:** 2026-11-11
**Deciders:** Product owner (sign-off given 2026-11-11, after the pre-launch review)

## Context

Device-to-device sync (CAP-SYNC) merges two devices' data with a pure function,
`mergePayloads` in `frenchpath/src/lib/pwa/merge.ts`. Until now most stores used "the newer record
wins". The pre-launch review (2026-11-11) showed that rule loses progress whenever the newer record
is worse than the older one:

- A checkpoint passed on one device was replaced by a later failed attempt from another device.
  Later units re-locked and re-passing awarded the XP twice.
- A 30-day streak ending yesterday on an old phone was replaced by a 1-day streak from a new phone.
  On equal dates the two devices never agreed.
- The winner of every comparison was decided by timestamps read from the incoming file, with no
  bound. A device with a wrong clock, or a crafted file, could replace every card's schedule and then
  win every later merge.
- The import preview counted only new items, so a file that replaced everything previewed as
  "0 changes". Unlike backup restore, sync took no safety copy and reloaded the page at once.

Forces at play:
- **Invariant 1** — on-device only; sync is a user-moved encrypted file, never a server.
- **Data safety** — a merge or restore must never lose earned progress; validate before destroying.
- **No per-day freeze history** — streak freezes are stored only as counters, so a streak cannot be
  recomputed exactly from daily stats.
- **Old installed versions** must keep working with files from newer ones: no IndexedDB version bump
  and no backup-format version bump.

## Decision

1. **Earned progress outranks recency.** For assessments, a passed record (`xpAwarded > 0`) always
   beats a failed one; recency only breaks ties between two passes or two failures. The latest
   `lastFailedAt` is kept either way.
2. **Streaks are joined, not replaced.** The merged streak ends on the later of the two last-active
   dates. Its length is the largest of (a) that day plus the consecutive active days before it in the
   merged daily stats, (b) the count held by the device(s) active on that day, and (c) the earlier
   device's own count plus the days since its last active day, when every day in between is active.
   A day is active when it has XP or reviews; a zero-XP lesson replay does not count. The longest
   streak never shrinks. On equal dates the merge takes fewer freezes available and more freezes used.
3. **Sync files from the future are refused whole.** A sync file whose activity dates are more than
   24 hours ahead of the importing device's clock is rejected before anything is read or written.
   Card due dates are exempt (they are legitimately in the future). Backup restore is exempt: a
   learner must always be able to restore their own backup.
4. **Sync import is as careful as backup restore.** It takes a safety copy first when there is data
   to lose, does not reload the page by itself, locks its preview while the import runs, and its
   preview states how many existing items the file will replace.

## Options Considered

### Assessments: pass wins (chosen) vs newest wins vs keep both attempts
| Dimension | Pass wins | Newest wins (old) | Keep an attempt history |
|---|---|---|---|
| Loses a pass | Never | Yes, on a later fail | Never |
| Schema change | None | None | New store + migration |
| Complexity | Low | Lowest | High |

### Streak: longest of day-walk, own count and joined count (chosen) vs recount from days only vs newest snapshot
| Dimension | Longest of the three | Recount from days | Newest snapshot (old) |
|---|---|---|---|
| Joins runs across devices | Yes | Yes | No |
| Keeps a freeze-bridged streak | Yes | No (gap looks like a break) | Yes |
| Devices converge | Yes, in one time zone (see known limits) | Yes | No on equal dates |
| Can invent a streak | No, except across time zones (see known limits) | No | No |

### Future-dated file: refuse whole (chosen) vs skip bad records vs clamp to now
| Dimension | Refuse whole | Skip records | Clamp |
|---|---|---|---|
| Learner understands what happened | Clear message naming both devices' clocks | Silent partial merge | Silent rewrite of history |
| Risk of a half-merged state | None | Yes | Yes |
| Legit file from a device with a wrong clock | Blocked; a backup file still moves the progress | Partly merged | Merged with false times |

## Trade-off Analysis

The merge is no longer a uniform "last write wins"; each store has the rule that fits what it holds.
That is more to explain, and the header comment in `merge.ts` and the tests carry that explanation.
Refusing a future-dated file whole is strict, but the alternatives merge data the learner cannot
inspect. Taking the largest of three streak estimates can keep a streak one day longer than a strict
recount would; that is preferred over shortening a streak the learner earned.

## Consequences

- Easier: syncing in any order gives the same result on both devices for assessments and streaks;
  a failed attempt can no longer undo a pass.
- Harder: a learner whose device clock is, or was while studying, more than a day ahead cannot sync
  from that device until real time catches up; a backup file is the way to move that progress.
- Known limits (amended 2026-11-11, after the review follow-up): review XP from two devices on the
  same day is added together, counting only reviews the other device did not have (review finding
  M2, fixed); lesson and exam XP for the same day is still the larger of the two. Sync import reads,
  merges and writes in one transaction (M3, fixed). The first time devices in different time zones
  exchange reviews, a day's review count can be off by the reviews that fall on another calendar day
  in the merging device's zone, and an inactive day can become active, so a streak can lengthen; it
  happens once per exchange and never lowers the larger side's count. Local
  records that are already future-dated still win later merges. The "replaced" count covers lessons,
  cards, skill profile and assessments, not streak or daily stats.
- To revisit: if freeze use is ever recorded per day, the streak can be recomputed exactly.

## Where it lives

- Assessment and streak rules, replaced count — `frenchpath/src/lib/pwa/merge.ts`
- Future-date guard — `frenchpath/src/lib/sync/mergeFile.ts`
- Safety copy, no auto-reload, locked preview, replaced count in the preview —
  `frenchpath/src/routes/settings/+page.svelte`
