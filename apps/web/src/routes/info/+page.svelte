<script lang="ts">
	import ExperienceList from '$lib/components/ExperienceList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="mx-auto max-w-5xl px-2 py-4 pb-10">
	<h1 class="sr-only">Info</h1>
	<ExperienceList experiences={data.experiences} />
</section>
