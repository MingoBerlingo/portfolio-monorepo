<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="mb-10 text-4xl font-bold text-gray-900">Posts</h1>
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
