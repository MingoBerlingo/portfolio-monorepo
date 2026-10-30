<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { cn } from '$lib/utils/cn';
	import { tick } from 'svelte';

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
	let keyboardMenu = $state(false);
	let toggleElement: HTMLButtonElement;
	let menuElement: HTMLElement;

	function handleScroll() {
		const currentY = window.scrollY;
		hidden = currentY > lastScrollY && currentY > 50;
		lastScrollY = currentY;
	}

	async function toggleMenu(event: MouseEvent) {
		keyboardMenu = event.detail === 0;
		menuOpen = !menuOpen;
		if (menuOpen) {
			await tick();
			menuElement.querySelector<HTMLAnchorElement>('a')?.focus();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!menuOpen) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			closeMenu();
			toggleElement.focus();
		}
		if (event.key === 'Tab') {
			const targets = [toggleElement, ...menuElement.querySelectorAll<HTMLAnchorElement>('a')];
			const index = targets.indexOf(document.activeElement as HTMLButtonElement);
			if (event.shiftKey && index <= 0) {
				event.preventDefault();
				targets.at(-1)?.focus();
			} else if (!event.shiftKey && (index === targets.length - 1 || index < 0)) {
				event.preventDefault();
				toggleElement.focus();
			}
		}
	}

	function handleResize() {
		if (window.innerWidth >= 768) closeMenu();
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:window onscroll={handleScroll} onkeydown={handleKeydown} onresize={handleResize} />

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
			bind:this={toggleElement}
			onclick={toggleMenu}
			class="relative z-50 flex h-6 w-6 flex-col items-center justify-center gap-1.5 text-foreground-1 md:hidden"
			aria-label={menuOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={menuOpen}
		>
			<span
				class={cn('block h-0.5 w-5 bg-foreground-1 transition-transform motion-base', {
					'translate-y-[4px] rotate-45': menuOpen
				})}
			></span>
			<span
				class={cn('block h-0.5 w-5 bg-foreground-1 transition-transform motion-base', {
					'-translate-y-[4px] -rotate-45': menuOpen
				})}
			></span>
		</button>
	</div>

	<!-- Keep the panel mounted so transitions can reverse smoothly. -->
	<nav
		bind:this={menuElement}
		class={cn(
			'mobile-menu fixed inset-0 z-40 flex h-dvh flex-col items-center justify-center gap-8 bg-background md:hidden',
			menuOpen && 'no-doc-scroll'
		)}
		data-open={menuOpen}
		data-keyboard={keyboardMenu}
		inert={!menuOpen}
		aria-hidden={!menuOpen}
		aria-label="Mobile navigation"
	>
		{#each navLinks as { href, label }, i (href)}
			<a
				{href}
				onclick={closeMenu}
				class={cn(
					'text-2xl text-foreground-1 hover:underline',
					page.url.pathname.startsWith(href) && 'underline'
				)}
				style="--item-delay: {i * 50}ms">{label}</a
			>
		{/each}
	</nav>
</header>

<style>
	.mobile-menu {
		opacity: 0;
		transform: translateY(-8px);
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 200ms var(--motion-ease-interactive),
			transform 200ms var(--motion-ease-interactive),
			visibility 0s 200ms;
	}
	.mobile-menu[data-open='true'] {
		opacity: 1;
		transform: none;
		visibility: visible;
		pointer-events: auto;
		transition-delay: 0s;
	}
	.mobile-menu a {
		opacity: 0;
		transform: translateY(4px);
		transition:
			opacity 200ms var(--motion-ease-interactive),
			transform 200ms var(--motion-ease-interactive);
	}
	.mobile-menu[data-open='true'] a {
		opacity: 1;
		transform: none;
		transition-delay: var(--item-delay);
	}
	.mobile-menu[data-keyboard='true'],
	.mobile-menu[data-keyboard='true'] a {
		transition: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.mobile-menu,
		.mobile-menu a {
			transform: none;
			transition-property: opacity, visibility;
			transition-delay: 0s;
		}
		.mobile-menu[data-open='true'] a {
			transition-delay: 0s;
		}
	}
</style>
