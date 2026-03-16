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

<h2 class="mb-10 text-4xl font-bold text-gray-900">Posts</h2>
<ul>
	{#each data.posts as post (post.id)}
		<div class="mb-5">
			<div class="mb-2">
				<h2 class="text-2xl font-bold text-gray-900">{post.title}</h2>
				<p class="text-sm text-gray-500">{post.id}</p>
			</div>

			<div class="prose">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized server-side -->
				{@html post.contentHtml}
			</div>
		</div>
	{/each}
</ul>
