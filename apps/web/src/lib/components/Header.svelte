<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { cn } from '$lib/utils/cn';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	const navLinks = [
		{ href: resolve('/projects'), label: 'Projects' },
		{ href: resolve('/info'), label: 'Info' },
		{ href: resolve('/contact'), label: 'Contact' }
	];
	const homeHref = resolve('/');

	// Hide header on scroll down, show on scroll up
	let lastScrollY = $state(0);
	let hidden = $state(false);
	let menuOpen = $state(false);

	function handleScroll() {
		const currentY = window.scrollY;
		hidden = currentY > lastScrollY && currentY > 50;
		lastScrollY = currentY;
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:window onscroll={handleScroll} />

<header
	class={cn('fixed top-0 left-0 z-50 w-full px-6 py-5 transition-transform motion-base', {
		'-translate-y-full': hidden && !menuOpen,
		'translate-y-0': !hidden || menuOpen
	})}
>
	<div class="relative z-50 flex items-center justify-between">
		<a href={homeHref} class="font-display text-foreground-1" onclick={closeMenu}
			>Alessandro Quets</a
		>

		<!-- Desktop nav -->
		<nav class="hidden items-center gap-8 md:flex">
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

		<!-- Burger button -->
		<button
			onclick={toggleMenu}
			class="relative z-50 flex h-6 w-6 flex-col items-center justify-center gap-1.5 text-foreground-1 md:hidden"
			aria-label={menuOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={menuOpen}
		>
			<span
				class={cn('block h-0.5 w-5 bg-foreground-1 transition-all motion-base', {
					'translate-y-[4px] rotate-45': menuOpen
				})}
			></span>
			<span
				class={cn('block h-0.5 w-5 bg-foreground-1 transition-all motion-base', {
					'-translate-y-[4px] -rotate-45': menuOpen
				})}
			></span>
		</button>
	</div>

	<!-- Mobile menu overlay -->
	{#if menuOpen}
		<nav
			class="no-doc-scroll fixed inset-0 z-40 flex h-dvh flex-col items-center justify-center gap-8 bg-background md:hidden"
			transition:slide={{ duration: 400, easing: cubicOut, axis: 'y' }}
		>
			{#each navLinks as { href, label }, i (href)}
				<a
					{href}
					onclick={closeMenu}
					class={cn(
						'animate-fade-in text-2xl text-foreground-1 transition-colors hover:underline',
						page.url.pathname.startsWith(href) && 'underline'
					)}
					style="animation-delay: {150 + i * 75}ms"
				>
					{label}
				</a>
			{/each}
		</nav>
	{/if}
</header>
