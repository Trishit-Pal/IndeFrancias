<!-- JourneySky.svelte — the home backdrop: one sky from Mumbai to Paris.     -->
<!-- Purely decorative. Scrolling down the route is travelling north: marigold -->
<!-- haze at the top, Paris blue at the bottom (left → right on the desktop    -->
<!-- panorama). Clouds sway slowly; a paper plane flies in once on load and    -->
<!-- rests in view; the dark theme adds a still star field.                    -->
<!-- No assets: gradients + three inline shapes. Motion stops under Reduce     -->
<!-- Motion via the global rules in layout.css (clouds rest where they are).   -->
<div class="fp-sky" aria-hidden="true">
	{#each [1, 2, 3] as n (n)}
		<svg class="fp-sky-cloud fp-sky-cloud--{n}" viewBox="0 0 120 44">
			<path d="M18 40a14 14 0 0 1 2-27.9A22 22 0 0 1 61 9a17 17 0 0 1 30 7 12.5 12.5 0 0 1 9 24Z" />
		</svg>
	{/each}
	<!-- Paper plane + contrail. It lives in the sky, not on the route: the route's
	     end is under the city medallion, so a plane there is hidden at rest. -->
	<svg class="fp-sky-plane" viewBox="-46 -10 58 20">
		<path class="fp-sky-trail" d="M-44 0 H-12" />
		<path class="fp-sky-dart" d="M10 0 L-8 -7 L-4.5 0 L-8 7 Z" />
	</svg>
</div>

<style>
	.fp-sky {
		position: absolute;
		z-index: -1;
		/* Reach under the fixed bottom nav: #main pads its bottom by this much. */
		inset: 0 0 calc(-5rem - env(safe-area-inset-bottom)) 0;
		overflow: hidden;
		pointer-events: none;
		background: linear-gradient(
			180deg,
			var(--fp-sky-mumbai) 0%,
			var(--fp-canvas) 45%,
			var(--fp-sky-paris) 100%
		);
	}
	@media (min-width: 1024px) {
		.fp-sky {
			inset: 0 0 -1.5rem 0; /* #main's lg:pb-6 */
			background: linear-gradient(
				90deg,
				var(--fp-sky-mumbai) 0%,
				var(--fp-canvas) 45%,
				var(--fp-sky-paris) 100%
			);
		}
	}
	/* Night: a still star field over the gradient (two offset dot grids so it
	   doesn't read as a pattern). */
	:global(.dark) .fp-sky::before {
		content: '';
		position: absolute;
		inset: 0;
		opacity: 0.75;
		background-image:
			radial-gradient(1.5px 1.5px at 20% 30%, var(--fp-ink) 50%, transparent 51%),
			radial-gradient(1.5px 1.5px at 70% 65%, var(--fp-ink) 50%, transparent 51%),
			radial-gradient(2px 2px at 45% 85%, var(--fp-saffron) 50%, transparent 51%);
		background-size:
			190px 170px,
			260px 230px,
			410px 370px;
	}

	.fp-sky-cloud {
		position: absolute;
		width: 132px;
		fill: var(--fp-paper);
		opacity: 0.85;
		animation: fp-sky-sway 48s ease-in-out infinite alternate;
	}
	:global(.dark) .fp-sky-cloud {
		fill: var(--fp-paper-warm);
		opacity: 0.45;
	}
	/* Mobile positions sit where the canvas shows: the header band and beside
	   the route rail. Desktop moves them to the page margins. */
	.fp-sky-cloud--1 {
		top: 1.25rem;
		left: 64%;
	}
	.fp-sky-cloud--2 {
		top: 31rem;
		left: 2%;
		width: 96px;
		animation-duration: 64s;
		animation-delay: -20s;
	}
	.fp-sky-cloud--3 {
		top: 37rem;
		left: 66%;
		width: 112px;
		animation-duration: 56s;
		animation-delay: -35s;
	}
	@media (min-width: 1024px) {
		.fp-sky-cloud--1 {
			left: 86%;
		}
		.fp-sky-cloud--2 {
			top: 34rem;
			left: 1%;
		}
		.fp-sky-cloud--3 {
			top: 44rem;
			left: 90%;
		}
	}

	/* The page's one load moment: the plane flies in from the Mumbai side and
	   parks beside the heading. Under Reduce Motion it is simply parked. */
	.fp-sky-plane {
		position: absolute;
		top: 5.6rem;
		right: 7%;
		width: 64px;
		overflow: visible;
		transform: rotate(-8deg);
		animation: fp-sky-fly 2.6s var(--fp-ease-out) 0.3s both;
	}
	@media (min-width: 1024px) {
		/* The hero card starts higher on desktop; park in the band beside the heading. */
		.fp-sky-plane {
			top: 2.4rem;
			right: 24%;
		}
	}
	.fp-sky-dart {
		fill: var(--fp-saffron);
		stroke: var(--fp-paper);
		stroke-width: 1.5;
		stroke-linejoin: round;
		paint-order: stroke;
	}
	.fp-sky-trail {
		fill: none;
		stroke: var(--fp-saffron);
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-dasharray: 1 6;
		opacity: 0.8;
	}
	@keyframes fp-sky-fly {
		from {
			transform: translate(-80vw, 3rem) rotate(-8deg);
		}
		to {
			transform: translate(0, 0) rotate(-8deg);
		}
	}

	/* A slow there-and-back sway: no wrap-around pop, and the resting position
	   (what Reduce Motion shows) is on screen. */
	@keyframes fp-sky-sway {
		from {
			transform: translateX(-9vw);
		}
		to {
			transform: translateX(9vw);
		}
	}
</style>
