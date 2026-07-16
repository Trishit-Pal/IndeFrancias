<!-- Icon.svelte — inline SVG glyph from the registry in icons.ts.
     Decorative by default (aria-hidden): pair with visible text or an
     aria-label on the interactive parent. -->
<script lang="ts">
	import { icons, type IconName } from './icons';

	let {
		name,
		size = 20,
		strokeWidth = 1.75,
		class: klass = ''
	}: {
		name: IconName;
		size?: number;
		strokeWidth?: number;
		class?: string;
	} = $props();
</script>

<svg
	aria-hidden="true"
	class={klass}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<path d={icons[name]} />
</svg>
