# Gloss drafts

One flat file per language, `<lang>.json` (for example `ml.json`): `{ "<key>": "<gloss>" }`.
A translator writes it from the worklist; a proofreader later corrects it in place.

- Key: `<unitId>/<cardId>` for a card, `<unitId>/<cardId>/example` for its example sentence.
- Worklist (French, English and Hindi for every key): `npm run content:gloss-drafts -- --export <out-file.json>`
- Merge into all packs: `npm run content:gloss-drafts -- --apply <lang>` (add `--check` to validate only).
- New cards (after curation) have none of the drafted languages yet, and a card needs all of them
  to be valid: apply them together, `npm run content:gloss-drafts -- --apply ml or as`.

The merge writes nothing if any draft is missing, in the wrong script, or has an unknown key.
A proofreader edits the flat file and re-runs `--apply`: the new text overwrites the old.
