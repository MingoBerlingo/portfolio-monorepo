<script lang="ts">
	import { scrollReveal } from '$lib/actions/scrollReveal';
	import type { Profile } from '@portfolio/types';
	import { splitIntroduction, type IntroductionImage } from '$lib/utils/introduction';
	import designSystem from '$lib/assets/introduction/design-system.svg';
	import components from '$lib/assets/introduction/components.svg';
	import pullRequest from '$lib/assets/introduction/pull-request.svg';

	let { profile }: { profile?: Profile } = $props();
	const wordSpace = ' ';
	const defaultText =
		'I work best between design and frontend, close enough to both sides to make them talk to each other.\n\nI focus on design systems architecture [design-system], UI component library development [components], and frontend implementation in React and Svelte. I can sit in a design review and open a pull request [pull-request] on the same day.';
	const defaults: IntroductionImage[] = [
		{ key: 'design-system', src: designSystem, alt: '' },
		{ key: 'components', src: components, alt: '' },
		{ key: 'pull-request', src: pullRequest, alt: '' }
	];
	const images = $derived(
		[
			...defaults,
			...(profile?.homepageImages ?? []).flatMap((entry) => {
				const image = entry.image;
				return typeof image === 'object' && image?.url && image.mimeType?.startsWith('image/')
					? [{ key: entry.key, src: image.url, alt: entry.alt ?? '' }]
					: [];
			})
		].reduce<IntroductionImage[]>(
			(result, image) => [...result.filter((item) => item.key !== image.key), image],
			[]
		)
	);
	const paragraphs = $derived(
		splitIntroduction(profile?.homepageIntroduction?.trim() || defaultText, images)
	);
</script>

<section
	class="mx-auto max-w-5xl px-2 pt-4 pb-20 md:pt-8 md:pb-28 xl:pb-40"
	aria-label="My approach"
>
	<div
		use:scrollReveal
		class="space-y-8 font-display text-3xl leading-[1.25] text-foreground-1 md:space-y-12 md:text-4xl md:leading-[1.25]"
	>
		{#each paragraphs as paragraph (paragraph)}
			<p>
				{#each paragraph as token, index (index)}
					<span data-reveal
						>{#if token.image}<img
								src={token.image.src}
								alt={token.image.alt}
								width="120"
								height="72"
								class="inline-image"
							/>{:else}{token.text}{/if}</span
					>{#if !/^[,.;:!?]/.test(paragraph[index + 1]?.text ?? '')}{wordSpace}{/if}
				{/each}
			</p>
		{/each}
	</div>
</section>

<style>
	[data-reveal] {
		display: inline-block;
	}
	.inline-image {
		display: inline-block;
		width: 1.8em;
		height: 1.1em;
		object-fit: cover;
		vertical-align: -0.15em;
		border-radius: 0.22em;
	}
</style>
