<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Education } from '@saiver/types';

	type Props = {
		education: Education[];
	};

	let { education }: Props = $props();

	function formatYear(value: string | null | undefined) {
		if (!value) return 'Now';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric'
		}).format(parsed);
	}

	function formatPeriod(item: { startDate: string; endDate?: string | null }) {
		const start = new Date(item.startDate);
		const end = item.endDate ? new Date(item.endDate) : null;

		if (!item.endDate) {
			return `${formatYear(item.startDate)} – Present`;
		}

		if (
			!Number.isNaN(start.getTime()) &&
			!Number.isNaN(end!.getTime()) &&
			start.getFullYear() === end!.getFullYear()
		) {
			return formatYear(item.startDate);
		}

		return `${formatYear(item.startDate)} – ${formatYear(item.endDate)}`;
	}
</script>

<div class="mt-6 space-y-0">
	{#each education as item, index (item.id)}
		<div
			class={cn(
				'text-base grid grid-cols-[120px_1fr_auto] items-center gap-6 pb-4 text-foreground-1',
				index > 0 && 'border-t border-border pt-4'
			)}
		>
			<div class="text-foreground-3">{formatPeriod(item)}</div>
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<span class="font-medium text-foreground-1">{item.title}</span>
					<span class="text-primary">@{item.school}</span>
				</div>
			</div>
			<div></div>
		</div>
	{/each}
</div>
