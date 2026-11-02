<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Profile, Keyword } from '@portfolio/types';
	import PhysicsChips from './PhysicsChips.svelte';
	import ScrambleLinkText from './ScrambleLinkText.svelte';

	let { profile, keywords = [] }: { profile: Profile; keywords?: Keyword[] } = $props();
	let footer: HTMLElement;
	let boundary: HTMLDivElement;
	let reveal = $state(false);
	let active = $state(false);
	const pages = [
		{ href: resolve('/'), label: 'Home' },
		{ href: resolve('/projects'), label: 'Projects' },
		{ href: resolve('/info'), label: 'Info' },
		{ href: resolve('/contact'), label: 'Contact' }
	];

	onMount(() => {
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let frame = 0;
		let headerOverFooter = false;
		const update = () => {
			frame = 0;
			const nextHeaderOverFooter = footer.getBoundingClientRect().top < 72;
			if (nextHeaderOverFooter !== headerOverFooter) {
				headerOverFooter = nextHeaderOverFooter;
				document.documentElement.dataset.headerOverFooter = String(headerOverFooter);
			}
			reveal = !motion.matches && footer.offsetHeight < window.innerHeight - 64;

			active =
				boundary.getBoundingClientRect().top < window.innerHeight - 48 &&
				footer.getBoundingClientRect().bottom > 0;
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		const observer = new ResizeObserver(schedule);
		observer.observe(footer);
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		motion.addEventListener('change', schedule);
		update();
		return () => {
			cancelAnimationFrame(frame);
			delete document.documentElement.dataset.headerOverFooter;
			observer.disconnect();
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			motion.removeEventListener('change', schedule);
		};
	});
</script>

<div bind:this={boundary} class="h-px" aria-hidden="true"></div>
<footer bind:this={footer} data-theme="dark" data-reveal={reveal}>
	<div class="footer-content mx-auto max-w-5xl px-6 pt-12 pb-6 md:px-2 md:pt-16">
		<div class="grid gap-10 md:grid-cols-[1.5fr_0.7fr_1fr] md:gap-12">
			<div>
				<h2 class="font-display text-3xl leading-[1.1] md:text-4xl">
					{profile.footerHeading || 'Let’s build something together.'}
				</h2>
			</div>
			<nav aria-label="Footer navigation">
				<ul class="space-y-2">
					{#each pages as page (page.href)}<li>
							<a href={page.href}><ScrambleLinkText text={page.label} /></a>
						</li>{/each}
				</ul>
			</nav>
			<div>
				<ul class="space-y-2">
					<li>
						<a href={`mailto:${profile.email}`}
							><ScrambleLinkText text="Email" /> <span aria-hidden="true">↗</span></a
						>
					</li>
					{#if profile.github?.url}<li>
							<a href={profile.github.url} target="_blank" rel="noopener noreferrer"
								><ScrambleLinkText text="GitHub" /> <span aria-hidden="true">↗</span></a
							>
						</li>{/if}
					{#if profile.linkedin?.url}<li>
							<a href={profile.linkedin.url} target="_blank" rel="noopener noreferrer"
								><ScrambleLinkText text="LinkedIn" /> <span aria-hidden="true">↗</span></a
							>
						</li>{/if}
				</ul>
			</div>
		</div>
		{#if keywords.length}
			<div class="mt-10">
				<p class="mb-3 text-xs text-foreground-2">
					A few things I work with <span aria-hidden="true">↘</span>
				</p>
				<div class="footer-chip-space" data-chip-start aria-hidden="true"></div>
			</div>
		{/if}
		<div
			data-chip-floor
			class="mt-6 flex flex-wrap justify-between gap-3 text-xs text-foreground-2"
		>
			<span>© {new Date().getFullYear()} {profile.name} {profile.surname}</span><span
				>In ♥ with pixels</span
			>
		</div>
	</div>
	<PhysicsChips {keywords} {active} fullFooter />
</footer>

<style>
	.footer-content {
		position: relative;
	}
	.footer-chip-space {
		min-height: 480px;
	}
	[data-chip-floor] {
		position: relative;
		z-index: 2;
	}
	@media (min-width: 768px) {
		.footer-chip-space {
			min-height: 300px;
		}
	}

	footer {
		position: relative;
		z-index: 0;
		background: var(--color-background);
		color: var(--color-foreground-1);
	}
	footer[data-reveal='true'] {
		position: sticky;
		bottom: 0;
	}
	footer:has(:focus-visible) {
		position: relative;
	}
	a {
		position: relative;
		z-index: 2;
		text-underline-offset: 4px;
	}
	a:hover {
		text-decoration: underline;
	}
	a:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 4px;
		border-radius: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		footer[data-reveal='true'] {
			position: relative;
		}
	}
</style>
