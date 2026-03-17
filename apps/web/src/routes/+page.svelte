<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/stores';

	let { data }: PageProps = $props();
	const profile = $page.data.profile;
</script>

<section class="mb-12">
	<h1 class="font-display text-2xl text-foreground-1">{profile.name} {profile.surname}</h1>
	<p class="mt-1 text-lg text-foreground-3">{profile.jobPosition}</p>
	<div class="mt-3 flex gap-4 text-sm">
		<a href="mailto:{profile.email}" class="text-primary hover:underline">{profile.email}</a>
		<a
			href={profile.github.url}
			class="text-primary hover:underline"
			target="_blank"
			rel="noopener noreferrer">{profile.github.label}</a
		>
		<a
			href={profile.linkedin.url}
			class="text-primary hover:underline"
			target="_blank"
			rel="noopener noreferrer">{profile.linkedin.label}</a
		>
	</div>
</section>

<h2 class="mb-10 font-display text-2xl text-foreground-1">Projects</h2>
<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.projects as project (project.id)}
		<li>
			<a
				href="/projects/{project.slug}"
				class="group block overflow-hidden rounded-lg border border-border transition-all hover:border-border-contrast hover:shadow-lg"
			>
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
					<h3 class="text-lg text-foreground-1 group-hover:text-primary">
						{project.title}
					</h3>
					<p class="mt-1 text-sm text-foreground-4">{new Date(project.year).getFullYear()}</p>
				</div>
			</a>
		</li>
	{/each}
</ul>
