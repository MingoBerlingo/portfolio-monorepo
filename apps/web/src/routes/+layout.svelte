<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import { Agentation } from 'sv-agentation';

	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-background text-foreground-1">
	<Header />
	<main class="p-6 pt-20">
		{@render children?.()}
	</main>
	{#if import.meta.env.DEV}
		<Agentation />
	{/if}
</div>
