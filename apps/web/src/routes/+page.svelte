<script lang="ts">
	import { page } from '$app/stores';
	import AsciiMorph from '$lib/components/AsciiMorph.svelte';

	const profile = $page.data.profile;
</script>

<section
	class="relative container mx-auto grid gap-8 rounded-xl bg-surface-1 p-5 sm:min-h-[60dvh] md:p-10 lg:grid-cols-2"
>
	<!-- CV Link -->
	<div
		class="absolute top-0 left-0 m-5 w-fit rounded-full bg-surface-3 px-4 py-1.5 font-display text-xl md:m-10 md:px-5 md:py-3"
	>
		CV
	</div>

	<!-- Introduction -->
	<div class="order-last flex flex-col justify-end lg:order-first">
		<h1 class="font-display text-2xl leading-[1.1] xl:text-4xl">
			<span class="sm:whitespace-nowrap">Hi! I’m Alessandro Quets.</span>
			<br />
			<span class="text-foreground-4 sm:whitespace-nowrap">I’m a Digital Designer & Frontend </span>
			<br class="hidden sm:block" />
			<span class="text-foreground-4 sm:whitespace-nowrap">Developer based in Lecco 🇮🇹</span>
		</h1>
	</div>

	<!-- ASCII animation -->
	<AsciiMorph class="mt-8 md:mt-0" />
</section>

<!-- Divider -->
<div class="h-80"></div>

<div class="mt-10 text-center">
	<h1 class="font-display text-2xl text-foreground-1">{profile.name} {profile.surname}</h1>
	<p class="mt-1 text-lg text-foreground-3">{profile.jobPosition}</p>
	<div class="mt-3 flex justify-center gap-4 text-sm">
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
</div>
