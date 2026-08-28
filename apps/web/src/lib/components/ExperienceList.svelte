<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Experience } from '@saiver/types';

	type Props = {
		experiences: Experience[];
	};

	let { experiences }: Props = $props();

	function formatYear(value: string | null | undefined) {
		if (!value) return 'Now';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric'
		}).format(parsed);
	}

	function formatPeriod(experience: { startDate: string; endDate?: string | null }) {
		const start = new Date(experience.startDate);
		const end = experience.endDate ? new Date(experience.endDate) : null;

		if (!experience.endDate) {
			return `${formatYear(experience.startDate)} – Present`;
		}

		if (
			!Number.isNaN(start.getTime()) &&
			!Number.isNaN(end!.getTime()) &&
			start.getFullYear() === end!.getFullYear()
		) {
			return formatYear(experience.startDate);
		}

		return `${formatYear(experience.startDate)} – ${formatYear(experience.endDate)}`;
	}
</script>

<div class="mt-6 space-y-0">
	{#each experiences as experience, index (experience.id)}
		<div
			class={cn(
				'text-base grid grid-cols-[120px_1fr_auto] items-center gap-6 pb-4 text-foreground-1',
				index > 0 && 'border-t border-border pt-4'
			)}
		>
			<div class="text-foreground-3">{formatPeriod(experience)}</div>
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<span class="font-medium text-foreground-1">{experience.role}</span>
					<span class="text-primary">@{experience.company}</span>
				</div>
			</div>
			{#if experience.industries?.length}
				<div class="flex flex-wrap justify-end gap-2 text-right">
					{#each experience.industries as industry (industry.id ?? `${experience.id}-${industry.industry}`)}
						<span class="text-sm text-foreground-3">{industry.industry}</span>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
