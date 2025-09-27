<script>
	export let data;
</script>

<h1>Posts</h1>
<ul>
	{#each data.posts as post}
		<li>{post.title}</li>
	{/each}
</ul>
