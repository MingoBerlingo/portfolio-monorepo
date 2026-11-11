<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from '$lib/icons';
	import { scrollReveal } from '$lib/actions/scrollReveal';
	import type { Hero } from '@portfolio/types';
	import { splitIntroduction, type IntroductionImage } from '$lib/utils/introduction';
	import designSystem from '$lib/assets/introduction/design-system.svg';

	let { hero }: { hero?: Hero } = $props();
	const wordSpace = ' ';
	const defaultText =
		'I work best between design and frontend, close enough to both sides to make them talk to each other.\n\nI focus on design systems architecture [design-system], UI component library development [components], and frontend implementation in React and Svelte. I can sit in a design review and open a pull request [pull-request] on the same day.';
	const inlineIcons: Record<string, IconName> = {
		eye: 'view',
		figma: 'figma',
		code: 'code',
		'pull-request': 'pull-request'
	};
	const defaults: IntroductionImage[] = [
		...Object.keys(inlineIcons).map((key) => ({ key, src: '', alt: '' })),
		{ key: 'design-system', src: designSystem, alt: '' },
		{ key: 'components', src: '', alt: '' }
	];
	const images = $derived(
		[
			...defaults,
			...(hero?.homepageImages ?? []).flatMap((entry) => {
				const image = entry.image;
				return typeof image === 'object' && image?.url && image.mimeType?.startsWith('image/')
					? [
							{
								key: entry.key,
								src: image.url,
								alt: entry.alt ?? '',
								previewDataURL: image.previewDataURL
							}
						]
					: [];
			})
		].reduce<IntroductionImage[]>(
			(result, image) => [...result.filter((item) => item.key !== image.key), image],
			[]
		)
	);
	const paragraphs = $derived(
		splitIntroduction(hero?.homepageIntroduction?.trim() || defaultText, images)
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
					<span data-reveal data-graphic={token.image?.key}
						>{#if token.image?.key === 'components'}<span class="inline-toggle" aria-hidden="true"
								><span></span></span
							>{:else if token.image && !token.image.src && inlineIcons[token.image.key]}<span
								class="inline-icon inline-block align-middle text-primary"
								aria-hidden="true"><Icon name={inlineIcons[token.image.key]} size={32} /></span
							>{:else if token.image}<span
								data-media
								data-media-state="loading"
								class="media-frame inline-image"
							>
								{#if token.image.previewDataURL}<img
										data-preview
										src={token.image.previewDataURL}
										alt=""
										aria-hidden="true"
										class="media-preview"
									/>{/if}
								<img
									src={token.image.src}
									alt={token.image.alt}
									width="120"
									height="72"
									loading="lazy"
									decoding="async"
								/>
							</span>{:else}{token.text}{/if}</span
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
	.inline-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		width: 1.2em;
		height: 0.65em;
		padding: 0.08em;
		vertical-align: 0.02em;
		border-radius: 999px;
		background: var(--color-primary);
	}
	.inline-toggle span {
		width: 0.49em;
		height: 0.49em;
		border-radius: 50%;
		background: var(--color-background);
	}
	:global([data-revealed='true'])[data-graphic='eye'] .inline-icon {
		animation: blink 650ms ease-in-out both;
	}
	:global([data-revealed='true'])[data-graphic='components'] .inline-toggle span {
		animation: toggle-on 650ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	:global([data-revealed='true'])[data-graphic='figma'] .inline-icon {
		animation: figma-nod 700ms ease-in-out both;
	}
	:global([data-revealed='true'])[data-graphic='code'] .inline-icon {
		animation: code-expand 600ms ease-in-out both;
	}
	:global([data-revealed='true'])[data-graphic='pull-request'] .inline-icon {
		animation: branch-lift 650ms ease-out both;
	}
	:global([data-revealed='true']) .inline-image {
		animation: image-accent 650ms ease-in-out both;
	}
	@keyframes blink {
		0%,
		25%,
		65%,
		100% {
			transform: scaleY(1);
		}
		45% {
			transform: scaleY(0.08);
		}
	}
	@keyframes toggle-on {
		0%,
		15% {
			transform: translateX(-0.55em);
		}
		100% {
			transform: translateX(0);
		}
	}
	@keyframes figma-nod {
		0%,
		100% {
			transform: rotate(0);
		}
		35% {
			transform: translateY(-3px) rotate(-8deg);
		}
		65% {
			transform: rotate(4deg);
		}
	}
	@keyframes code-expand {
		0%,
		100% {
			transform: scaleX(1);
		}
		45% {
			transform: scaleX(1.2);
		}
	}
	@keyframes branch-lift {
		0%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-4px);
		}
		70% {
			transform: translateY(1px);
		}
	}
	@keyframes image-accent {
		0%,
		100% {
			transform: scale(1);
		}
		45% {
			transform: scale(1.06);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global([data-revealed='true']) .inline-icon,
		:global([data-revealed='true']) .inline-toggle span,
		:global([data-revealed='true']) .inline-image {
			animation: none;
		}
	}

	.inline-image > img:not([data-preview]) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
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
