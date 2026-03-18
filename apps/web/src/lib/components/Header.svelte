<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils/cn';

	const navLinks = [
		{ href: '/projects', label: 'Projects' },
		{ href: '/info', label: 'Info' },
		{ href: '/contact', label: 'Contact' }
	];

	// Hide header on scroll down, show on scroll up
	let lastScrollY = $state(0);
	let hidden = $state(false);

	function handleScroll() {
		const currentY = window.scrollY;
		hidden = currentY > lastScrollY && currentY > 50;
		lastScrollY = currentY;
	}
</script>

<svelte:window onscroll={handleScroll} />

<header
	class={cn('fixed top-0 left-0 z-50 w-full px-6 py-5 transition-transform duration-300', {
		'-translate-y-full': hidden,
		'translate-y-0': !hidden
	})}
>
	<div class="flex items-center justify-between">
		<a href="/" class="font-display text-foreground-1">Alessandro Quets</a>

		<nav class="flex items-center gap-8">
			{#each navLinks as { href, label } (href)}
				<a
					{href}
					class={cn(
						'text-foreground-1 transition-colors hover:underline',
						page.url.pathname.startsWith(href) && 'underline'
					)}
				>
					{label}
				</a>
			{/each}
		</nav>
	</div>
</header>
