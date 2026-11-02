<script lang="ts">
	import type { Keyword } from '@portfolio/types';
	import { chipPhysics } from '$lib/actions/chipPhysics';
	let {
		keywords,
		active = false,
		fullFooter = false
	}: { keywords: Keyword[]; active?: boolean; fullFooter?: boolean } = $props();
</script>

{#if keywords.length}
	<div class={fullFooter ? 'full-footer' : 'mt-10'}>
		{#if !fullFooter}<p class="mb-3 text-xs text-foreground-2">
				A few things I work with <span aria-hidden="true">↘</span>
			</p>{/if}
		{#key JSON.stringify(keywords.map(({ id, label }) => [id, label]))}
			<ul class="chip-scene" aria-label="Project keywords" use:chipPhysics={active}>
				{#each keywords as keyword (keyword.id)}
					<li>
						<button type="button" disabled aria-label={`Toss ${keyword.label} keyword`}
							>{keyword.label}</button
						>
					</li>
				{/each}
			</ul>
		{/key}
	</div>
{/if}

<style>
	.full-footer {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}
	.full-footer .chip-scene {
		position: absolute;
		inset: 0;
		min-height: 0;
		padding: 24px 24px 80px;
		border: 0;
	}
	.full-footer button {
		pointer-events: auto;
	}

	.chip-scene {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-content: end;
		justify-content: center;
		gap: 8px;
		min-height: 300px;
		padding: 12px;
		overflow: hidden;
		border-bottom: 1px solid var(--color-border);
	}
	li {
		list-style: none;
	}
	button {
		display: block;
		max-width: min(280px, 80vw);
		padding: 10px 20px;
		border-radius: 9999px;
		background: var(--color-foreground-1);
		color: var(--color-background);
		font-family: var(--font-display);
		font-size: clamp(1rem, 1.6vw, 1.25rem);
		font-weight: 500;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 4px;
	}
	.chip-scene:global([data-physics='true']) li {
		position: absolute;
		left: 0;
		top: 0;
	}
	.chip-scene:global([data-physics='true']) button {
		width: 100%;
		cursor: grab;
		touch-action: none;
	}
	.chip-scene:global([data-physics='true']) button:active {
		cursor: grabbing;
	}
	@media (min-width: 768px) {
		.chip-scene {
			min-height: 240px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.chip-scene {
			min-height: auto;
			padding-block: 24px;
		}
	}
</style>
