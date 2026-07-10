# Product

## Register

product

## Users

Indian learners going from zero French to a DELF/DALF pass, on phones they already own
(often low-end Android), fully offline, no account. Four equal personas (SPEC §2):
Aanya (19, college, study-abroad), Rohan (27, DELF B1/B2 for Canada PR points),
Meera (34, hospitality, workplace French), and the privacy-conscious learner who
refuses to be tracked. Context of use: a daily 10–20 minute retention ritual
(lesson + SRS review + streak), frequently on commutes with unreliable connectivity.

## Product Purpose

FrenchPath is an offline-first learning product whose heart is the daily retention
loop (daily goal + streak + FSRS-6 review); DELF/DALF mock exams are milestones that
prove progress. Success = learners return daily and pass a real credential — without
the product ever owning their data. The decision rule for every conflict: favour
whatever strengthens the daily loop AND the free/offline/private promise.

## Brand Personality

Warm, honest, journey-like. The "Le Grand Voyage" world (Mumbai→Paris path, characters
Mira/Léo/Coco) gives a hand-crafted travel-journal feel: editorial serif display type,
ink-on-cream paper surfaces, Jaipur pink / terracotta / saffron / Seine blue accents,
offset ink shadows. Voice is encouraging but never manipulative — celebration without
guilt.

## Anti-references

- Duolingo-style coercion: guilt notifications, fake urgency, streak-shaming, dark
  patterns (banned by SPEC invariant 6).
- Tracker-ridden freemium apps: no analytics, no account walls, no paywalled hearts.
- Generic SaaS gradient/glassmorphism aesthetics — the product world is paper, ink,
  and postage, not glass and neon.

## Design Principles

1. **The daily loop wins ties** — any surface that competes with the lesson/review
   ritual loses.
2. **Private by construction, visible to the user** — privacy is a feature users can
   see (sovereignty panel, local-data notices), not a policy page.
3. **Earned familiarity, journal flavour** — standard product affordances (forms,
   buttons, settings) with Le Grand Voyage materials; display serif for moments,
   Manrope for tasks.
4. **Non-coercive motivation** — celebrate progress, never punish absence.
5. **Low-end first** — budget Android phones are the primary hardware; performance
   and offline behaviour are design constraints, not optimizations.

## Accessibility & Inclusion

Keyboard operable throughout, `aria-live` for dynamic feedback, `prefers-reduced-motion`
honoured on every animation, touch targets ≥44px (SPEC invariant 6). 10 UI locales
including Hindi (Devanagari via Tiro Devanagari Hindi) and Hinglish; French content is
glossed through the learner's own language. Target WCAG 2.1 AA contrast.
