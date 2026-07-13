/**
 * FrenchPath icon registry — hand-drawn 24×24 stroke paths (L'Indigo Express).
 * Rendered by Icon.svelte with round caps/joins at 1.75px stroke so the set
 * matches Fraunces' warmth. Multiple subpaths live in one `d` string.
 * Self-hosted by construction (inline SVG — CSP-safe, zero assets).
 */
export const icons = {
	/* ── Navigation ── */
	learn:
		'M12 6.6C10.2 5 7.6 4.2 4.6 4.2c-.6 0-1.1.4-1.1 1v12.3c0 .6.5 1 1.1 1 3 0 5.6.8 7.4 2.4 1.8-1.6 4.4-2.4 7.4-2.4.6 0 1.1-.4 1.1-1V5.2c0-.6-.5-1-1.1-1-3 0-5.6.8-7.4 2.4zm0 0v14.3',
	review:
		'M17 2.5 20.5 6 17 9.5M20.5 6H8a5 5 0 0 0-5 5v.5m4 10L3.5 18 7 14.5M3.5 18H16a5 5 0 0 0 5-5v-.5',
	progress: 'M3 17l5.5-5.5 4 3L19 7.5M14.5 7.5H19V12M3 21h18',
	settings: 'M4 6h16M4 12h16M4 18h16M15 4v4M8 10v4M17 16v4',
	/* ── Actions ── */
	play: 'M8.5 5.5v13a.4.4 0 0 0 .6.3l10-6.5a.4.4 0 0 0 0-.6l-10-6.5a.4.4 0 0 0-.6.3z',
	pause: 'M8 5.5v13M16 5.5v13',
	speaker:
		'M11 5.5 6.8 9H4a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h2.8l4.2 3.5zM14.8 9.6a4 4 0 0 1 0 4.8M17.4 7.2a7.3 7.3 0 0 1 0 9.6',
	mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18.5V21',
	check: 'M4.5 12.5l5 5L19.5 6.5',
	close: 'M6 6l12 12M18 6 6 18',
	share: 'M12 3.5V15M8 7l4-3.5L16 7M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5',
	'chevron-left': 'M14.5 5.5 8 12l6.5 6.5',
	'chevron-right': 'M9.5 5.5 16 12l-6.5 6.5',
	/* ── Status ── */
	lock: 'M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5m-11 0h13v7.5a2.5 2.5 0 0 1-2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5z',
	flame:
		'M12 3.5c.6 2.8-1.3 4.5-2.4 6-1 1.4-1.6 2.7-1.6 4a6 6 0 0 0 12 0c0-1.6-.6-3-1.5-4.2-.7 1.2-1.6 1.6-2.5 1.2.5-2.4-.8-5.4-4-7z',
	spark: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z',
	snowflake: 'M12 3v18M4.5 7l15 10M19.5 7l-15 10',
	'map-pin':
		'M12 21S5.5 15.4 5.5 10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zm0-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
	train:
		'M6.5 4h11A1.5 1.5 0 0 1 19 5.5V15a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5.5A1.5 1.5 0 0 1 6.5 4zM5 10.5h14M9 14.6h.01M15 14.6h.01M7.5 21 9 18M16.5 21 15 18'
} as const;

export type IconName = keyof typeof icons;
