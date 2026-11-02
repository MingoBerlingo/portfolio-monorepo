<script lang="ts">
	import '../app.css';
	import { mediaPlayback } from '$lib/actions/mediaPlayback';
	import '$lib/styles/rich-text.css';
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';

	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="isolate min-h-screen bg-background text-foreground-1">
	<Header />
	<main
		use:mediaPlayback
		class="relative z-10 min-h-screen bg-background p-4 pt-14 pb-20 md:p-6 md:pt-20 md:pb-32"
	>
		{@render children?.()}
	</main>
	<Footer profile={data.profile} keywords={data.footerKeywords} />
</div>
