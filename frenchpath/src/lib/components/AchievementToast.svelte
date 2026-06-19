<!-- AchievementToast.svelte — Level-up / milestone celebration overlay -->
<!-- Usage: bind celebrate={show}; pass event data as prop                  -->
<script lang="ts">
	import CharacterCoco from './CharacterCoco.svelte';

	type AchievementEvent =
		| 'level_up'
		| 'postcard'
		| 'streak_7'
		| 'streak_30'
		| 'lesson_complete'
		| 'exam_pass';

	let {
		event = null,
		title = '',
		subtitle = '',
		xpGain = 0,
		cocoLevel = 1,
		onDismiss
	}: {
		event?: AchievementEvent | null;
		title?: string;
		subtitle?: string;
		xpGain?: number;
		cocoLevel?: number;
		onDismiss?: () => void;
	} = $props();

	const visible = $derived(event !== null);

	const CONFETTI_COLORS = ['#E94F64', '#2D6CDF', '#D4A24C', '#8AA67A'];
	const confettiPieces = Array.from({ length: 16 }, (_, i) => ({
		left: 5 + i * 6 + '%',
		color: CONFETTI_COLORS[i % 4],
		delay: (i * 0.08).toFixed(2) + 's',
		dur: (2.6 + (i % 5) * 0.14).toFixed(2) + 's',
		round: i % 3 === 0
	}));
</script>

{#if visible}
	<div
		class="fp-achievement-backdrop"
		role="dialog"
		aria-modal="true"
		aria-live="assertive"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) onDismiss?.();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onDismiss?.();
		}}
	>
		<div class="fp-achievement-card">
			<!-- confetti -->
			<div class="fp-confetti-container" aria-hidden="true">
				{#each confettiPieces as p (p.left)}
					<span
						class="fp-confetti-piece"
						style="left:{p.left};background:{p.color};animation-delay:{p.delay};animation-duration:{p.dur};{p.round
							? 'border-radius:50%'
							: ''}"
					></span>
				{/each}
			</div>

			<div class="fp-achievement-body">
				<p class="fp-achievement-eyebrow" style="animation:fp-rise .5s ease-out both">
					Niveau supérieur
				</p>
				<h2 class="fp-achievement-title" style="animation:fp-rise .5s ease-out .08s both">
					{title}
				</h2>
				{#if subtitle}
					<p class="fp-achievement-subtitle" style="animation:fp-rise .5s ease-out .16s both">
						{subtitle}
					</p>
				{/if}

				<div class="fp-achievement-mascot" style="animation:fp-rise .5s ease-out .2s both">
					<div class="fp-mascot-glow" aria-hidden="true"></div>
					<CharacterCoco size="lg" level={cocoLevel} />
					{#if event === 'level_up' || event === 'exam_pass'}
						<div class="fp-medal">🥇</div>
					{/if}
				</div>

				<div class="fp-achievement-chips" style="animation:fp-rise .5s ease-out .3s both">
					{#if xpGain > 0}
						<span class="fp-xp-chip">+{xpGain} XP</span>
					{/if}
					{#if event === 'postcard'}
						<span class="fp-postcard-chip">📮 Nouvelle carte</span>
					{/if}
				</div>

				<button class="fp-achievement-cta" onclick={onDismiss}> Continuer </button>
			</div>
		</div>
	</div>
{/if}

<style>
	.fp-achievement-backdrop {
		position: fixed;
		inset: 0;
		z-index: 999;
		background: rgba(43, 27, 23, 0.55);
		backdrop-filter: blur(3px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}
	.fp-achievement-card {
		position: relative;
		background: radial-gradient(circle at 50% 25%, #ffe9c7 0%, #f4d5c2 55%, #e9b79c 100%);
		border: 2px solid var(--fp-ink);
		border-radius: 22px;
		box-shadow: 8px 8px 0 var(--fp-ink);
		max-width: 420px;
		width: 100%;
		overflow: hidden;
		animation: fp-stamp 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.2) both;
	}
	.fp-confetti-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}
	.fp-confetti-piece {
		position: absolute;
		top: -20px;
		width: 9px;
		height: 14px;
		animation: fp-confetti linear infinite;
	}
	.fp-achievement-body {
		position: relative;
		z-index: 2;
		padding: 30px 28px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
	}
	.fp-achievement-eyebrow {
		font-family: var(--fp-font-mono);
		font-size: 11px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--fp-terracotta);
		margin: 0;
	}
	.fp-achievement-title {
		font-family: var(--fp-font-display);
		font-weight: 400;
		font-size: clamp(28px, 5vw, 42px);
		line-height: 1.05;
		margin: 0;
		color: var(--fp-ink);
	}
	.fp-achievement-subtitle {
		font-family: var(--fp-font-hindi);
		font-size: 16px;
		color: var(--fp-muted);
		margin: 0;
	}
	.fp-achievement-mascot {
		position: relative;
		margin: 14px 0 6px;
	}
	.fp-mascot-glow {
		position: absolute;
		inset: -14px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(212, 162, 76, 0.55), transparent 70%);
		animation: fp-flame 1.6s ease-in-out infinite;
	}
	.fp-medal {
		position: absolute;
		bottom: -6px;
		right: -6px;
		width: 42px;
		height: 42px;
		background: var(--fp-saffron);
		border: 2.5px solid var(--fp-ink);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		box-shadow: 3px 3px 0 var(--fp-ink);
		animation: fp-stamp 0.7s ease-out 0.3s both;
	}
	.fp-achievement-chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.fp-xp-chip {
		background: var(--fp-ink);
		color: var(--fp-paper);
		border-radius: var(--fp-r-pill);
		padding: 6px 14px;
		font-weight: 800;
		font-size: 14px;
	}
	.fp-postcard-chip {
		background: var(--fp-paper);
		border: 2px solid var(--fp-ink);
		border-radius: var(--fp-r-pill);
		padding: 6px 14px;
		font-weight: 700;
		font-size: 13px;
	}
	.fp-achievement-cta {
		margin-top: 10px;
		background: var(--fp-jaipur);
		color: var(--fp-paper);
		border: 2px solid var(--fp-ink);
		border-radius: var(--fp-r-pill);
		padding: 12px 30px;
		font-weight: 800;
		font-size: 15px;
		cursor: pointer;
		box-shadow: var(--fp-shadow-card);
		transition: transform 0.1s ease;
	}
	.fp-achievement-cta:active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0 var(--fp-ink);
	}
</style>
