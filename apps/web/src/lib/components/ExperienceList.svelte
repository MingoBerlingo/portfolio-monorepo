<script lang="ts">
	import TimelineRow from '$lib/components/TimelineRow.svelte';
	import { formatPeriod } from '$lib/utils/date';
	import type { Experience } from '@portfolio/types';

	type Props = {
		experiences: Experience[];
	};

	let { experiences }: Props = $props();
</script>

<div class="mt-6 space-y-0">
	{#each experiences as experience, index (experience.id)}
		<TimelineRow
			period={formatPeriod(experience)}
			title={experience.role}
			subtitle={experience.company}
			isFirst={index === 0}
		>
			{#snippet right()}
				{#if experience.industries?.length}
					{#each experience.industries as industry (industry.id ?? `${experience.id}-${industry.industry}`)}
						<span class="text-sm text-foreground-3">{industry.industry}</span>
					{/each}
				{/if}
			{/snippet}
		</TimelineRow>
	{/each}
</div>
