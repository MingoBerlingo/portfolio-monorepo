<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="container mx-auto p-6 bg-background text-foreground-1">
	{@render children?.()}
</div>
