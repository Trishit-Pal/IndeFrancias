<!-- VoyageMap.svelte — L'Indigo Express journey map (India → Paris) -->
<!-- The app's signature: an SVG vintage-airline route threading five CEFR   -->
<!-- cities, its marigold progress line "drawing in" to the learner's        -->
<!-- current stop, custom line-art landmark medallions, Coco stationed at    -->
<!-- the current city, and a faint jali lattice behind it all. Horizontal    -->
<!-- route panorama on desktop, vertical winding route on mobile. City       -->
<!-- labels stay HTML (reliable a11y/e2e text), the route is an SVG layer.   -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { BETA_LEVELS, type UnitSummary } from '$lib/content/schema';
	import type { LessonStatus } from '$lib/db/schema';
	import * as m from '$lib/paraglide/messages';
	import Icon from '$lib/components/Icon.svelte';
	import CharacterCoco from '$lib/components/CharacterCoco.svelte';

	let {
		units,
		states,
		lockReasons,
		currentUnitId,
		reduceMotion = false
	}: {
		units: UnitSummary[];
		states: Map<string, LessonStatus>;
		lockReasons: Map<string, string | null>;
		currentUnitId: string | undefined;
		reduceMotion: boolean;
	} = $props();

	// ── Voyage city config (line-art glyph keyed by `glyph`) ──
	const CITIES = [
		{ level: 'A1', city: 'Marseille', glyph: 'marseille', color: 'var(--fp-sage)' },
		{ level: 'A2', city: 'Lyon', glyph: 'lyon', color: 'var(--fp-jaipur)' },
		{ level: 'B1', city: 'Bordeaux', glyph: 'bordeaux', color: 'var(--fp-saffron)' },
		{ level: 'B2', city: 'Strasbourg', glyph: 'strasbourg', color: 'var(--fp-seine)' },
		{ level: 'C1', city: 'Paris', glyph: 'paris', color: 'var(--fp-terracotta)' }
	] as const;

	type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
	const CEFR_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

	function unitStatus(id: string): LessonStatus {
		return states.get(id) ?? 'locked';
	}

	const bands = $derived(
		CEFR_ORDER.map((level) => ({
			level,
			city: CITIES.find((c) => c.level === level)!,
			units: units.filter((u) => u.cefrLevel === level)
		})).filter((b) => b.units.length > 0)
	);

	const currentLevel = $derived(units.find((u) => u.id === currentUnitId)?.cefrLevel ?? null);

	const activeBand = $derived(
		bands.find((b) => b.level === currentLevel) ??
			bands.find((b) => b.units.some((u) => unitStatus(u.id) !== 'locked')) ??
			bands[0] ??
			null
	);

	function completedCount(band: { units: UnitSummary[] }) {
		return band.units.filter((u) => unitStatus(u.id) === 'completed').length;
	}
	function bandDone(band: { units: UnitSummary[] }) {
		return band.units.length > 0 && completedCount(band) === band.units.length;
	}
	function isCurrentLevel(level: string) {
		return level === currentLevel;
	}

	// Index of the learner's current city along the route, for the progress fill.
	const currentIndex = $derived.by(() => {
		const i = bands.findIndex((b) => b.level === activeBand?.level);
		return i < 0 ? 0 : i;
	});
	// Fraction of the route the marigold line reveals: reach the current city, or
	// the whole way once every band is complete.
	const progressFraction = $derived.by(() => {
		if (bands.length <= 1) return bands.length === 1 && bandDone(bands[0]) ? 1 : 0;
		if (bands.every(bandDone)) return 1;
		return currentIndex / (bands.length - 1);
	});

	// ── SVG route geometry ──
	// City points in the route svg's viewBox (0 0 100 24, preserveAspectRatio
	// none). x is placed to sit under each equal-width HTML column's centre; the
	// rail svg spans 6%..94% of the rail, so we remap column centres into it.
	type Pt = { x: number; y: number };
	const railInset = 6; // % — must match .fp-route-svg left/right
	const cityPoints = $derived.by<Pt[]>(() => {
		const n = bands.length;
		if (n === 0) return [];
		return bands.map((_, i) => {
			const centrePct = ((i + 0.5) / n) * 100; // column centre, % of full rail
			const x = ((centrePct - railInset) / (100 - railInset * 2)) * 100;
			const y = 12 + (i % 2 === 0 ? -4.5 : 4.5); // gentle wave
			return { x, y };
		});
	});

	/** Catmull-Rom → cubic Bézier for a smooth route through the points. */
	function smoothPath(pts: Pt[]): string {
		if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y}` : '';
		let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[i - 1] ?? pts[i];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[i + 2] ?? p2;
			const c1x = p1.x + (p2.x - p0.x) / 6;
			const c1y = p1.y + (p2.y - p0.y) / 6;
			const c2x = p2.x - (p3.x - p1.x) / 6;
			const c2y = p2.y - (p3.y - p1.y) / 6;
			d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
		}
		return d;
	}
	const routeD = $derived(smoothPath(cityPoints));

	// Draw-in: progress line reveals from nothing to progressFraction on mount.
	// Under reduced motion it starts revealed (no flash, no transition).
	let drawn = $state(false);
	onMount(() => {
		drawn = true;
	});
	const progressOffset = $derived(drawn || reduceMotion ? 1 - progressFraction : 1);
</script>

{#snippet glyph(key: string)}
	{#if key === 'marseille'}
		<path d="M4.5 16.5 H19.5 L17.5 20 H6.5 Z" />
		<path d="M12 4 V16.5" />
		<path d="M12 5 L18 15 H12 Z" />
	{:else if key === 'lyon'}
		<path d="M5 15.5 A7 7 0 0 1 19 15.5" />
		<path d="M3.5 15.5 H20.5" />
		<path d="M12 6 V8" />
		<circle cx="12" cy="5.2" r="1.1" />
	{:else if key === 'bordeaux'}
		<path d="M12 3.5 V6.4" />
		<path d="M12 5 Q15 4.2 15.6 6.6" />
		<circle cx="10" cy="9" r="1.9" />
		<circle cx="14" cy="9" r="1.9" />
		<circle cx="12" cy="12" r="1.9" />
		<circle cx="8.6" cy="12.6" r="1.9" />
		<circle cx="15.4" cy="12.6" r="1.9" />
		<circle cx="12" cy="15.4" r="1.9" />
	{:else if key === 'strasbourg'}
		<path d="M12 3.2 L8 20 H16 Z" />
		<path d="M12 1 V3.2 M10.7 1.9 H13.3" />
		<path d="M11 20 V16.4 A1 1 0 0 1 13 16.4 V20" />
		<circle cx="12" cy="13" r="1.2" />
	{:else if key === 'paris'}
		<path d="M6.5 20 C9 13 11 8 12 3 C13 8 15 13 17.5 20" />
		<path d="M8.7 13 H15.3" />
		<path d="M7.3 17 H16.7" />
		<path d="M6.5 20 H17.5" />
	{/if}
{/snippet}

<div class="fp-voyage-map" class:reduce-motion={reduceMotion} data-testid="path-scene">
	<!-- Desktop: horizontal route panorama -->
	<div class="fp-voyage-h-rail">
		<!-- Jali lattice backdrop (one of two places the texture appears app-wide) -->
		<svg class="fp-jali" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
			<defs>
				<pattern
					id="fp-jali-tile"
					width="30"
					height="30"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(45)"
				>
					<circle cx="15" cy="15" r="6.5" fill="none" stroke="currentColor" stroke-width="1" />
					<path d="M15 0 V30 M0 15 H30" stroke="currentColor" stroke-width="0.6" />
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#fp-jali-tile)" />
		</svg>

		<!-- Route: dotted base + marigold progress fill -->
		<svg class="fp-route-svg" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
			<path class="fp-route-base" d={routeD} pathLength="1" />
			<path
				class="fp-route-progress"
				d={routeD}
				pathLength="1"
				style="stroke-dashoffset:{progressOffset}"
			/>
		</svg>

		{#each bands as band (band.level)}
			{@const done = bandDone(band)}
			{@const active = isCurrentLevel(band.level)}
			<div
				class="fp-voyage-city"
				class:fp-voyage-city--done={done}
				class:fp-voyage-city--active={active}
				class:fp-voyage-city--locked={!done && !active}
			>
				<div class="fp-voyage-city-label">{band.city.city}</div>
				<div class="fp-voyage-city-sublabel">
					{band.level}{#if BETA_LEVELS.has(band.level)}&nbsp;<span class="fp-beta-badge"
							>{m.beta_badge()}</span
						>{/if}
				</div>
				<div
					class="fp-voyage-city-node"
					style="--city-color:{band.city.color}"
					class:fp-pulse={active && !reduceMotion}
				>
					{#if active}
						<div class="fp-city-marker" aria-hidden="true">
							<CharacterCoco size="xs" animate={!reduceMotion} />
						</div>
					{/if}
					<svg class="fp-city-glyph" viewBox="0 0 24 24" aria-hidden="true">
						{@render glyph(band.city.glyph)}
					</svg>
				</div>
				<div class="fp-voyage-city-status">
					{#if done}✓ {completedCount(band)}/{band.units.length}{:else if active}▶ {completedCount(
							band
						)}/{band.units.length}{:else}<Icon name="lock" size={13} />{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Mobile: vertical winding route -->
	<div class="fp-voyage-v-rail">
		<div class="fp-route-v-track" aria-hidden="true">
			<div class="fp-route-v-fill" style="height:{progressFraction * 100}%"></div>
		</div>
		{#each bands as band, bi (band.level)}
			{@const done = bandDone(band)}
			{@const active = isCurrentLevel(band.level)}
			<div class="fp-voyage-city-row {bi % 2 === 0 ? 'fp-row-left' : 'fp-row-right'}">
				<div class="fp-voyage-city-info" class:fp-text-right={bi % 2 === 0}>
					<span class="fp-city-name" class:fp-active-city={active}>{band.city.city}</span>
					<span class="fp-city-cefr"
						>{band.level}{active
							? ' · vous êtes ici'
							: done
								? ' · complet'
								: ' · à venir'}{#if BETA_LEVELS.has(band.level)}&nbsp;<span class="fp-beta-badge"
								>{m.beta_badge()}</span
							>{/if}</span
					>
				</div>
				<div
					class="fp-voyage-city-node-v"
					style="--city-color:{band.city.color}"
					class:fp-voyage-city--done={done}
					class:fp-voyage-city--active={active}
					class:fp-voyage-city--locked={!done && !active}
					class:fp-pulse={active && !reduceMotion}
					aria-label="{band.city.city} {band.level}"
				>
					{#if active}
						<div class="fp-city-marker fp-city-marker--v" aria-hidden="true">
							<CharacterCoco size="xs" animate={!reduceMotion} />
						</div>
					{/if}
					<svg class="fp-city-glyph" viewBox="0 0 24 24" aria-hidden="true">
						{@render glyph(band.city.glyph)}
					</svg>
				</div>
			</div>
		{/each}
	</div>

	<!-- Active leg: the current city's lessons — ticket-stub unit entries -->
	{#if activeBand}
		<div class="fp-voyage-leg">
			<p class="fp-voyage-leg-label">
				<svg class="fp-leg-glyph" viewBox="0 0 24 24" aria-hidden="true">
					{@render glyph(activeBand.city.glyph)}
				</svg>
				{activeBand.city.city} · {activeBand.level}{#if BETA_LEVELS.has(activeBand.level)}&nbsp;<span
						class="fp-beta-badge">{m.beta_badge()}</span
					>{/if}
			</p>
			<ul class="fp-lesson-nodes">
				{#each activeBand.units as unit (unit.id)}
					{@const st = unitStatus(unit.id)}
					{@const isCur = unit.id === currentUnitId}
					<li>
						<a
							href={st !== 'locked' ? resolve('/learn/[unitId]', { unitId: unit.id }) : undefined}
							class="fp-lesson-node"
							class:fp-lesson-node--done={st === 'completed'}
							class:fp-lesson-node--current={isCur}
							class:fp-lesson-node--locked={st === 'locked'}
							class:fp-pulse={isCur && !reduceMotion}
							data-testid="unit-card"
							aria-label={st === 'locked'
								? `${unit.title} – locked. ${lockReasons.get(unit.id) ?? ''}`
								: `${unit.title} – ${st}`}
						>
							<span class="fp-lesson-node-icon" aria-hidden="true">
								{#if st === 'completed'}✓{:else if isCur}<Icon name="play" size={14} />{:else}<Icon
										name="lock"
										size={14}
									/>{/if}
							</span>
							<span class="fp-lesson-node-text">
								<span class="fp-lesson-node-title">{unit.title}</span>
								{#if st === 'locked'}
									<span class="fp-lesson-node-reason">{lockReasons.get(unit.id) ?? 'Locked'}</span>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.fp-voyage-map {
		font-family: var(--fp-font-ui);
	}

	/* ── Horizontal (desktop) route panorama ── */
	.fp-voyage-h-rail {
		position: relative;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		align-items: end;
		gap: 10px;
		min-height: 148px;
		padding: 40px 16px 18px;
		background: var(--fp-paper);
		border: 1px solid var(--fp-border);
		border-radius: var(--fp-r-xl);
		box-shadow: var(--fp-elevation-2);
		overflow: hidden;
	}
	.fp-voyage-v-rail {
		display: none;
	}
	@media (max-width: 1023px) {
		.fp-voyage-h-rail {
			display: none;
		}
		.fp-voyage-v-rail {
			display: block;
			position: relative;
			padding: 8px 4px 12px;
		}
	}

	.fp-jali {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		color: var(--fp-ink);
		opacity: 0.045;
		pointer-events: none;
	}
	:global(.dark) .fp-jali {
		opacity: 0.07;
	}

	.fp-route-svg {
		position: absolute;
		left: 6%;
		right: 6%;
		top: 56%;
		height: 64px;
		pointer-events: none;
		overflow: visible;
	}
	.fp-route-base {
		fill: none;
		stroke: color-mix(in srgb, var(--fp-ink) 32%, transparent);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-dasharray: 0.1 6;
		vector-effect: non-scaling-stroke;
	}
	.fp-route-progress {
		fill: none;
		stroke: var(--fp-saffron);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 1;
		vector-effect: non-scaling-stroke;
		transition: stroke-dashoffset 1.2s var(--fp-ease-out);
		filter: drop-shadow(0 1px 2px color-mix(in srgb, var(--fp-saffron) 45%, transparent));
	}
	:global(html.reduce-motion) .fp-route-progress {
		transition: none;
	}

	.fp-voyage-city {
		position: relative;
		z-index: 2;
		text-align: center;
	}
	.fp-city-marker {
		position: absolute;
		left: 50%;
		top: -24px;
		transform: translateX(-50%);
		z-index: 4;
		pointer-events: none;
	}
	.fp-voyage-city-label {
		font-family: var(--fp-font-display);
		font-weight: 500;
		font-size: clamp(13px, 1.5vw, 18px);
		line-height: 1;
		color: var(--fp-ink);
	}
	.fp-voyage-city-sublabel {
		font-family: var(--fp-font-mono);
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fp-muted);
		margin-bottom: 10px;
	}
	.fp-voyage-city-node {
		position: relative;
		width: 56px;
		height: 56px;
		margin: 0 auto;
		border: 1px solid var(--fp-border);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--fp-paper);
		color: var(--fp-muted);
		box-shadow: var(--fp-elevation-1);
		transition:
			transform 0.15s var(--fp-ease-out),
			box-shadow 0.15s ease;
	}
	.fp-city-glyph {
		width: 30px;
		height: 30px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.fp-voyage-city--done .fp-voyage-city-node,
	.fp-voyage-city--active .fp-voyage-city-node {
		background: color-mix(in srgb, var(--city-color) 20%, var(--fp-paper));
		border-color: var(--city-color);
		color: color-mix(in srgb, var(--city-color) 75%, var(--fp-ink));
	}
	.fp-voyage-city--locked .fp-voyage-city-node {
		border-style: dashed;
		opacity: 0.55;
	}
	.fp-voyage-city--active .fp-voyage-city-node {
		width: 66px;
		height: 66px;
		margin-top: -5px;
		box-shadow:
			var(--fp-elevation-2),
			0 0 0 4px color-mix(in srgb, var(--city-color) 22%, transparent);
	}
	.fp-voyage-city--active .fp-city-glyph {
		width: 34px;
		height: 34px;
	}
	.fp-voyage-city-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		font-family: var(--fp-font-mono);
		font-size: 11px;
		color: var(--fp-muted);
		margin-top: 8px;
	}
	.fp-voyage-city--active .fp-voyage-city-label {
		color: var(--fp-jaipur);
		font-size: 20px;
	}
	.fp-voyage-city--active .fp-voyage-city-status {
		color: var(--fp-jaipur);
	}

	/* ── Vertical (mobile) winding route ── */
	.fp-route-v-track {
		position: absolute;
		left: 50%;
		top: 26px;
		bottom: 26px;
		width: 2px;
		transform: translateX(-1px);
		background-image: repeating-linear-gradient(
			0deg,
			color-mix(in srgb, var(--fp-ink) 32%, transparent) 0 2px,
			transparent 2px 8px
		);
		pointer-events: none;
	}
	.fp-route-v-fill {
		position: absolute;
		inset: 0 auto auto 0;
		width: 100%;
		background: var(--fp-saffron);
		border-radius: 2px;
		transition: height 1.2s var(--fp-ease-out);
	}
	:global(html.reduce-motion) .fp-route-v-fill {
		transition: none;
	}
	.fp-voyage-city-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 14px;
		position: relative;
		z-index: 2;
	}
	.fp-row-left {
		flex-direction: row;
	}
	.fp-row-right {
		flex-direction: row-reverse;
	}
	.fp-voyage-city-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.fp-text-right {
		text-align: right;
	}
	.fp-city-name {
		font-family: var(--fp-font-display);
		font-weight: 500;
		font-size: 16px;
		line-height: 1;
		color: var(--fp-ink);
	}
	.fp-active-city {
		color: var(--fp-jaipur);
		font-size: 18px;
	}
	.fp-city-cefr {
		font-family: var(--fp-font-mono);
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fp-muted);
	}
	/* Quiet, factual "beta" marker on AI-drafted levels — a hairline pill in the
	   muted mono voice, never an alarm colour (SPEC invariant 6). */
	.fp-beta-badge {
		display: inline-block;
		margin-left: 6px;
		padding: 1px 6px;
		font-family: var(--fp-font-mono);
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		line-height: 1.4;
		vertical-align: middle;
		color: var(--fp-muted);
		border: 1px solid color-mix(in srgb, var(--fp-ink) 25%, transparent);
		border-radius: 999px;
	}
	.fp-voyage-city-node-v {
		position: relative;
		width: 46px;
		height: 46px;
		border: 1px solid var(--fp-border);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: var(--fp-paper);
		color: var(--fp-muted);
		box-shadow: var(--fp-elevation-1);
	}
	.fp-voyage-city-node-v .fp-city-glyph {
		width: 26px;
		height: 26px;
	}
	.fp-voyage-city-node-v.fp-voyage-city--done,
	.fp-voyage-city-node-v.fp-voyage-city--active {
		background: color-mix(in srgb, var(--city-color) 20%, var(--fp-paper));
		border-color: var(--city-color);
		color: color-mix(in srgb, var(--city-color) 75%, var(--fp-ink));
	}
	.fp-voyage-city-node-v.fp-voyage-city--active {
		box-shadow:
			var(--fp-elevation-2),
			0 0 0 4px color-mix(in srgb, var(--city-color) 22%, transparent);
	}
	.fp-voyage-city-node-v.fp-voyage-city--locked {
		border-style: dashed;
		opacity: 0.55;
	}
	.fp-city-marker--v {
		position: absolute;
		top: -20px;
		left: 50%;
		transform: translateX(-50%);
	}

	/* ── Active-leg lesson nodes (ticket stubs) ── */
	.fp-voyage-leg {
		margin-top: 16px;
		padding: 16px;
		background: var(--fp-paper);
		border: 1px solid var(--fp-border);
		border-radius: var(--fp-r-xl);
		box-shadow: var(--fp-elevation-2);
	}
	.fp-voyage-leg-label {
		font-family: var(--fp-font-display);
		font-weight: 500;
		font-size: 18px;
		color: var(--fp-ink);
		margin: 0 0 12px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.fp-leg-glyph {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: var(--fp-jaipur);
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
		flex-shrink: 0;
	}
	.fp-lesson-nodes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	@media (min-width: 640px) {
		.fp-lesson-nodes {
			grid-template-columns: 1fr 1fr;
		}
	}
	/* Ticket-stub: perforated left edge via a dashed rule + notch feel. */
	.fp-lesson-node {
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 13px;
		border: 1px solid var(--fp-border);
		border-radius: var(--fp-r-md);
		background: var(--fp-paper);
		color: inherit;
		text-decoration: none;
		box-shadow: var(--fp-elevation-1);
		transition:
			transform 0.14s var(--fp-ease-out),
			box-shadow 0.14s ease,
			border-color 0.14s ease;
	}
	.fp-lesson-node:hover {
		transform: translateY(-2px);
		box-shadow: var(--fp-elevation-2);
		border-color: color-mix(in srgb, var(--fp-ink) 30%, var(--fp-paper));
	}
	:global(html.reduce-motion) .fp-lesson-node:hover {
		transform: none;
	}
	.fp-lesson-node:focus-visible {
		outline: 2px solid var(--fp-ink);
		outline-offset: 2px;
	}
	.fp-lesson-node-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		border: 1px solid var(--fp-border);
		border-radius: 50%;
		font-size: 14px;
		font-weight: 700;
		color: var(--fp-muted);
		background: var(--fp-cream);
	}
	.fp-lesson-node-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.fp-lesson-node-title {
		font-size: 14px;
		font-weight: 600;
		line-height: 1.15;
		color: var(--fp-ink);
	}
	.fp-lesson-node-reason {
		font-size: 12px;
		line-height: 1.2;
		color: var(--fp-muted);
	}
	.fp-lesson-node--done {
		background: color-mix(in srgb, var(--fp-sage) 15%, var(--fp-paper));
		border-color: color-mix(in srgb, var(--fp-sage) 45%, var(--fp-border));
	}
	.fp-lesson-node--done .fp-lesson-node-icon {
		background: var(--fp-sage);
		border-color: var(--fp-sage);
		color: #fff;
	}
	.fp-lesson-node--current {
		border-color: var(--fp-jaipur);
		box-shadow:
			var(--fp-elevation-1),
			0 0 0 2px color-mix(in srgb, var(--fp-jaipur) 30%, transparent);
	}
	.fp-lesson-node--current .fp-lesson-node-icon {
		background: var(--fp-saffron);
		border-color: var(--fp-saffron);
		color: var(--fp-ink);
	}
	.fp-lesson-node--locked {
		border-style: dashed;
		opacity: 0.62;
		box-shadow: none;
		pointer-events: none;
		cursor: not-allowed;
	}
</style>
