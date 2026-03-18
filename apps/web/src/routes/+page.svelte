<script lang="ts">
	import { page } from '$app/stores';

	const profile = $page.data.profile;
</script>

<section>
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
