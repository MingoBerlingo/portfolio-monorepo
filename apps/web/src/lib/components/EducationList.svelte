<script lang="ts">
	import TimelineRow from '$lib/components/TimelineRow.svelte';
	import { formatPeriod } from '$lib/utils/date';
	import type { Education } from '@saiver/types';

	type Props = {
		education: Education[];
	};

	let { education }: Props = $props();
</script>

<div class="mt-6 space-y-0">
	{#each education as item, index (item.id)}
		<TimelineRow
			period={formatPeriod(item)}
			title={item.title}
			subtitle={item.school}
			isFirst={index === 0}
		/>
	{/each}
</div>
