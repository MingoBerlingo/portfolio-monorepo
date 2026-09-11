<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	type Props = {
		period: string;
		title: string;
		subtitle: string;
		isFirst?: boolean;
		right?: Snippet;
	};

	let { period, title, subtitle, isFirst = false, right }: Props = $props();
</script>

<div
	class={cn(
		'text-base flex flex-col gap-1 pb-3 text-foreground-1 sm:grid sm:grid-cols-[120px_1fr_auto] sm:items-center sm:gap-6 sm:pb-4',
		!isFirst && 'border-t border-border pt-3 sm:pt-4'
	)}
>
	<div class="sm:text-base text-sm text-foreground-3">{period}</div>
	<div class="min-w-0">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
			<span class="font-medium text-foreground-1">{title}</span>
			<span class="text-primary">@{subtitle}</span>
		</div>
	</div>
	{#if right}
		<div class="flex flex-wrap gap-2 text-left sm:justify-end sm:text-right">
			{@render right()}
		</div>
	{/if}
</div>
