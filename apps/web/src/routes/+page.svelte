<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/stores';

	let { data }: PageProps = $props();
	const profile = $page.data.profile;
</script>

<section class="mb-12">
	<h1 class="text-4xl font-bold text-gray-900">{profile.name} {profile.surname}</h1>
	<p class="mt-1 text-lg text-gray-600">{profile.jobPosition}</p>
	<div class="mt-3 flex gap-4 text-sm">
		<a href="mailto:{profile.email}" class="text-blue-600 hover:underline">{profile.email}</a>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
		<a href={profile.github.url} class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{profile.github.label}</a>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
		<a href={profile.linkedin.url} class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{profile.linkedin.label}</a>
	</div>
</section>

<h2 class="mb-10 text-4xl font-bold text-gray-900">Projects</h2>
<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.projects as project (project.id)}
		<li>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- prerendered static links -->
			<a href="/projects/{project.slug}" class="group block overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
				{#if typeof project.featuredImage === 'object' && project.featuredImage?.url}
					<img
						src={project.featuredImage.url}
						alt={project.featuredImage.alt}
						width={project.featuredImage.width ?? undefined}
						height={project.featuredImage.height ?? undefined}
						class="aspect-video w-full object-cover"
					/>
				{/if}
				<div class="p-4">
					<h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600">{project.title}</h3>
					<p class="mt-1 text-sm text-gray-500">{new Date(project.year).getFullYear()}</p>
				</div>
			</a>
		</li>
	{/each}
</ul>
