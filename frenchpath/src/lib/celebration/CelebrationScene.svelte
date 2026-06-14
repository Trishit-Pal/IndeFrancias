<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { T } from '@threlte/core';

	let { clip = 'cheer' }: { clip?: string } = $props();

	const bounce = $derived(clip === 'dance' || clip === 'cheer');
</script>

<div class="h-48 w-full" aria-hidden="true">
	<Canvas>
		<T.PerspectiveCamera makeDefault position={[0, 1.2, 3]} fov={45} />
		<T.AmbientLight intensity={0.6} />
		<T.DirectionalLight position={[2, 4, 2]} intensity={1} />
		<!-- Stylised French coach: body + beret (procedural, offline-safe) -->
		<T.Group position={[0, 0, 0]} rotation.y={bounce ? Math.sin(Date.now() / 300) * 0.15 : 0}>
			<T.Mesh position={[0, 0.9, 0]}>
				<T.CapsuleGeometry args={[0.35, 0.7, 4, 8]} />
				<T.MeshStandardMaterial color="#2563eb" />
			</T.Mesh>
			<T.Mesh position={[0, 1.55, 0]}>
				<T.SphereGeometry args={[0.32, 16, 16]} />
				<T.MeshStandardMaterial color="#fcd9b6" />
			</T.Mesh>
			<T.Mesh position={[0, 1.82, 0]} rotation.x={-0.2}>
				<T.CylinderGeometry args={[0.38, 0.38, 0.12, 16]} />
				<T.MeshStandardMaterial color="#dc2626" />
			</T.Mesh>
		</T.Group>
	</Canvas>
</div>
