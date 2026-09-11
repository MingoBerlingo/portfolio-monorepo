<script lang="ts">
	import AsciiMorph from '$lib/components/AsciiMorph.svelte';
	import { contactFrames } from '$lib/components/contact-frames';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const profile = data.profile;
</script>

<section class="mx-auto grid max-w-5xl gap-10 px-2 py-4 pb-10 lg:grid-cols-2 lg:items-center">
	<div>
		<h1 class="font-display text-2xl text-foreground-1">Get in touch</h1>

		<div class="text-base mt-10 flex flex-col gap-8 text-foreground-2">
			<div class="space-y-1">
				<p class="text-sm font-normal tracking-normal text-primary">Email</p>
				<a
					class="text-foreground-1 underline-offset-4 hover:underline"
					href={`mailto:${profile.email}`}
				>
					{profile.email}
				</a>
			</div>

			{#if profile.github?.url}
				<div class="space-y-1">
					<p class="text-sm font-normal tracking-normal text-primary">Github</p>
					<a
						class="inline-flex items-center gap-1 text-foreground-1 underline-offset-4 hover:underline"
						href={profile.github.url}
						target="_blank"
						rel="noreferrer"
					>
						<span>{profile.github.label || 'GitHub'}</span>
						<Icon name="launch" size={12} fill="currentColor" />
					</a>
				</div>
			{/if}

			{#if profile.linkedin?.url}
				<div class="space-y-1">
					<p class="text-sm font-normal tracking-normal text-primary">Linkedin</p>
					<a
						class="inline-flex items-center gap-1 text-foreground-1 underline-offset-4 hover:underline"
						href={profile.linkedin.url}
						target="_blank"
						rel="noreferrer"
					>
						<span>{profile.linkedin.label || 'LinkedIn'}</span>
						<Icon name="launch" size={12} fill="currentColor" />
					</a>
				</div>
			{/if}
		</div>
	</div>

	<AsciiMorph
		frames={contactFrames}
		interval={4000}
		class="text-[2.5cqw] sm:text-[1.8cqw] lg:text-[1.4cqw]"
		ariaLabel="Animated ASCII art with contact-related illustrations"
	/>
</section>
