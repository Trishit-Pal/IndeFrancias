<!-- VoyageMap.svelte — Le Grand Voyage path map (Mumbai → Paris) -->
<!-- Replaces PathScene as the home path. Renders a responsive city rail   -->
<!-- (horizontal on desktop, zigzag on mobile) plus the active city's       -->
<!-- lesson nodes — the interactive unit entry points.                      -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { UnitSummary } from '$lib/content/schema';
	import type { LessonStatus } from '$lib/db/schema';

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

	// ── Voyage city config ──
	const CITIES = [
		{ level: 'A1', city: 'Marseille', emoji: '⛵', color: 'var(--fp-sage)' },
		{ level: 'A2', city: 'Lyon', emoji: '🥖', color: 'var(--fp-jaipur)' },
		{ level: 'B1', city: 'Bordeaux', emoji: '🍇', color: 'var(--fp-saffron)' },
		{ level: 'B2', city: 'Strasbourg', emoji: '⛪', color: 'var(--fp-seine)' },
		{ level: 'C1', city: 'Paris', emoji: '🗼', color: 'var(--fp-navy)' }
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

	// Current city = the band containing the current unit.
	const currentLevel = $derived(units.find((u) => u.id === currentUnitId)?.cefrLevel ?? null);

	// The "leg" whose lessons we surface. Prefer the band with the current
	// unit; otherwise the first band that still has a playable unit; else the
	// first band. Guarantees a visible lesson list whenever bands exist.
	const activeBand = $derived(
		bands.find((b) => b.level === currentLevel) ??
			bands.find((b) => b.units.some((u) => unitStatus(u.id) !== 'locked')) ??
			bands[0] ??
			null
	);

	function completedCount(band: { units: UnitSummary[] }) {
		return band.units.filter((u) => unitStatus(u.id) === 'completed').length;
	}
	function isCurrentLevel(level: string) {
		return level === currentLevel;
	}
</script>

<div class="fp-voyage-map" class:reduce-motion={reduceMotion} data-testid="path-scene">
	<!-- Desktop: horizontal city rail -->
	<div class="fp-voyage-h-rail">
		<div class="fp-route fp-voyage-route-line" aria-hidden="true"></div>
		{#each bands as band (band.level)}
			{@const done = completedCount(band) === band.units.length}
			{@const active = isCurrentLevel(band.level)}
			<div
				class="fp-voyage-city"
				class:fp-voyage-city--done={done}
				class:fp-voyage-city--active={active}
				class:fp-voyage-city--locked={!done && !active}
			>
				<div class="fp-voyage-city-label">{band.city.city}</div>
				<div class="fp-voyage-city-sublabel">{band.level}</div>
				<div
					class="fp-voyage-city-node"
					class:fp-pulse={active && !reduceMotion}
					style="background:{done || active ? band.city.color : 'var(--fp-paper)'}"
				>
					{band.city.emoji}
				</div>
				<div class="fp-voyage-city-status">
					{#if done}✓ {completedCount(band)}/{band.units.length}{:else if active}▶ {completedCount(
							band
						)}/{band.units.length}{:else}🔒{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Mobile: vertical zigzag city rail -->
	<div class="fp-voyage-v-rail">
		<div class="fp-route-v fp-voyage-route-v" aria-hidden="true"></div>
		{#each bands as band, bi (band.level)}
			{@const done = completedCount(band) === band.units.length}
			{@const active = isCurrentLevel(band.level)}
			<div class="fp-voyage-city-row {bi % 2 === 0 ? 'fp-row-left' : 'fp-row-right'}">
				<div class="fp-voyage-city-info" class:fp-text-right={bi % 2 === 0}>
					<span class="fp-city-name" class:fp-active-city={active}>{band.city.city}</span>
					<span class="fp-city-cefr"
						>{band.level}{active ? ' · vous êtes ici' : done ? ' · complet' : ' · à venir'}</span
					>
				</div>
				<div
					class="fp-voyage-city-node-v"
					class:fp-pulse={active && !reduceMotion}
					style="background:{done || active ? band.city.color : 'var(--fp-paper)'}; {!done &&
					!active
						? 'border-style:dashed;opacity:.55'
						: ''}"
					aria-label="{band.city.city} {band.level}"
				>
					{band.city.emoji}
				</div>
			</div>
		{/each}
	</div>

	<!-- Active leg: the current city's lessons — interactive unit entries -->
	{#if activeBand}
		<div class="fp-voyage-leg">
			<p class="fp-voyage-leg-label">
				<span aria-hidden="true">{activeBand.city.emoji}</span>
				{activeBand.city.city} · {activeBand.level}
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
								{#if st === 'completed'}✓{:else if isCur}▶{:else}🔒{/if}
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

	/* ── Horizontal (desktop) ── */
	.fp-voyage-h-rail {
		position: relative;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		align-items: end;
		gap: 10px;
		padding: 32px 16px 16px;
		background: var(--fp-paper);
		border: 1.5px solid var(--fp-ink);
		border-radius: 18px;
		box-shadow: var(--fp-shadow-card);
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
			padding: 6px 4px 12px;
		}
	}

	.fp-voyage-route-line {
		position: absolute;
		left: 6%;
		right: 6%;
		top: 62%;
		height: 2px;
		pointer-events: none;
	}
	.fp-voyage-city {
		text-align: center;
		position: relative;
		z-index: 2;
	}
	.fp-voyage-city-label {
		font-family: var(--fp-font-display);
		font-size: clamp(13px, 1.5vw, 18px);
		line-height: 1;
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
		width: 54px;
		height: 54px;
		margin: 0 auto;
		border: 2.5px solid var(--fp-ink);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
	}
	.fp-voyage-city--locked .fp-voyage-city-node {
		border-style: dashed;
		opacity: 0.55;
	}
	.fp-voyage-city--active .fp-voyage-city-node {
		width: 64px;
		height: 64px;
		margin-top: -5px;
		font-size: 26px;
	}
	.fp-voyage-city-status {
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

	/* ── Vertical (mobile) ── */
	.fp-voyage-route-v {
		position: absolute;
		left: 50%;
		top: 24px;
		bottom: 24px;
		width: 2px;
		transform: translateX(-1px);
		pointer-events: none;
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
		font-size: 16px;
		line-height: 1;
	}
	.fp-active-city {
		color: var(--fp-jaipur);
		font-weight: 600;
		font-size: 18px;
	}
	.fp-city-cefr {
		font-family: var(--fp-font-mono);
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fp-muted);
	}
	.fp-voyage-city-node-v {
		width: 44px;
		height: 44px;
		border: 2px solid var(--fp-ink);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		flex-shrink: 0;
		background: var(--fp-paper);
	}

	/* ── Active-leg lesson nodes ── */
	.fp-voyage-leg {
		margin-top: 16px;
		padding: 16px;
		background: var(--fp-paper);
		border: 1.5px solid var(--fp-ink);
		border-radius: 18px;
		box-shadow: var(--fp-shadow-card);
	}
	.fp-voyage-leg-label {
		font-family: var(--fp-font-display);
		font-size: 18px;
		margin: 0 0 10px;
		display: flex;
		align-items: center;
		gap: 6px;
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
	.fp-lesson-node {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border: 2px solid var(--fp-ink);
		border-radius: 14px;
		background: var(--fp-paper);
		color: inherit;
		text-decoration: none;
		box-shadow: 2px 2px 0 var(--fp-ink);
		transition: transform 0.12s ease;
	}
	.fp-lesson-node:hover {
		transform: translate(-1px, -1px);
	}
	.fp-lesson-node:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.fp-lesson-node:focus-visible {
		outline: 2px solid var(--fp-ink);
		outline-offset: 2px;
	}
	.fp-lesson-node-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		border: 1.5px solid var(--fp-ink);
		border-radius: 50%;
		font-size: 13px;
		font-weight: 700;
		background: var(--fp-paper);
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
	}
	.fp-lesson-node-reason {
		font-size: 12px;
		line-height: 1.2;
		color: var(--fp-muted);
	}
	.fp-lesson-node--done {
		background: color-mix(in srgb, var(--fp-sage) 22%, var(--fp-paper));
	}
	.fp-lesson-node--done .fp-lesson-node-icon {
		background: var(--fp-sage);
		color: var(--fp-paper);
	}
	.fp-lesson-node--current {
		border-color: var(--fp-jaipur);
		box-shadow: 2px 2px 0 var(--fp-jaipur);
	}
	.fp-lesson-node--current .fp-lesson-node-icon {
		background: var(--fp-saffron);
	}
	.fp-lesson-node--locked {
		border-style: dashed;
		opacity: 0.6;
		box-shadow: none;
		pointer-events: none;
		cursor: not-allowed;
	}
</style>
