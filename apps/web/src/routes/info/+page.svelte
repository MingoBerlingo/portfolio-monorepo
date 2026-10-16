<script lang="ts">
	import EducationList from '$lib/components/EducationList.svelte';
	import ExperienceList from '$lib/components/ExperienceList.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const profile = data.profile;
</script>

<section class="mx-auto max-w-5xl px-2 py-4 pb-10">
	<p class="mb-3 text-sm font-normal tracking-normal text-primary">Introduction</p>
	{#if profile.presentationHtml}
		<div class="rich-text rich-text--info prose pb-4 md:prose-lg">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side -->
			{@html profile.presentationHtml}
		</div>
	{/if}

	<p class="mt-20 mb-3 text-sm font-normal tracking-normal text-primary">Experiences</p>
	<ExperienceList experiences={data.experiences} />

	{#if data.education?.length}
		<p class="mt-20 mb-3 text-sm font-normal tracking-normal text-primary">Education</p>
		<EducationList education={data.education} />
	{/if}

	<div class="mt-20">
		<div class="text-base grid gap-5 text-foreground-2 sm:grid-cols-3">
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
</section>
