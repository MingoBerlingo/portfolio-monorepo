<script lang="ts">
	import { onMount, tick } from 'svelte';
	let dark = $state(false);
	onMount(() => {
		const preference = matchMedia('(prefers-color-scheme: dark)');
		const sync = () => {
			dark = document.documentElement.dataset.theme
				? document.documentElement.dataset.theme === 'dark'
				: preference.matches;
		};
		sync();
		const observer = new MutationObserver(sync);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});
		preference.addEventListener('change', sync);
		return () => {
			observer.disconnect();
			preference.removeEventListener('change', sync);
		};
	});
	async function toggle(event: MouseEvent) {
		const root = document.documentElement;
		if (root.dataset.themeTransition) return;
		const next = !dark;
		const apply = async () => {
			dark = next;
			root.dataset.theme = next ? 'dark' : 'light';
			try {
				localStorage.setItem('theme', root.dataset.theme);
			} catch {
				/* Storage can be unavailable. */
			}
			await tick();
		};
		if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
			await apply();
			return;
		}
		const bounds = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
		const x = bounds.left + bounds.width / 2;
		const y = bounds.top + bounds.height / 2;
		const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
		root.dataset.themeTransition = 'true';
		try {
			const transition = document.startViewTransition(apply);
			// A skipped transition still applies the selected theme.
			void transition.finished.catch(() => {});
			await transition.ready;
			await root.animate(
				{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
				{
					duration: 450,
					easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
					pseudoElement: '::view-transition-new(root)'
				}
			).finished;
		} catch {
			/* A skipped snapshot needs no animation fallback. */
		} finally {
			delete root.dataset.themeTransition;
		}
	}
</script>

<button
	class="theme-switch"
	type="button"
	role="switch"
	aria-label="Dark theme"
	aria-checked={dark}
	onclick={toggle}
>
	<svg
		class="sun"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.7"
		aria-hidden="true"
		><circle cx="12" cy="12" r="4" /><path
			d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
		/></svg
	>
	<svg
		class="moon"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.7"
		aria-hidden="true"><path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" /></svg
	>
	<span class="thumb" aria-hidden="true"></span>
</button>

<style>
	.theme-switch {
		position: relative;
		width: 68px;
		height: 36px;
		flex-shrink: 0;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--color-foreground-1) 8%, transparent);
		background: light-dark(var(--color-zinc-100), var(--color-zinc-900));
		box-shadow:
			inset 2px 3px 6px rgb(0 0 0 / 18%),
			inset -2px -2px 5px rgb(255 255 255 / 14%);
		cursor: pointer;
	}
	svg {
		position: absolute;
		top: 9px;
		width: 16px;
		height: 16px;
		color: var(--color-foreground-2);
		filter: drop-shadow(0 1px 0 rgb(255 255 255 / 18%));
		z-index: 2;
		pointer-events: none;
	}
	.sun {
		left: 10px;
	}
	.moon {
		right: 10px;
	}
	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--color-zinc-50);
		border: 3px solid var(--color-zinc-50);
		box-shadow:
			2px 3px 5px rgb(0 0 0 / 20%),
			inset 1px 2px 3px rgb(0 0 0 / 9%),
			inset -1px -1px 2px var(--color-white);
		transition: transform 200ms var(--motion-ease-interactive);
	}
	.theme-switch[aria-checked='true'] .thumb {
		transform: translateX(32px);
	}
	.theme-switch[aria-checked='false'] .sun,
	.theme-switch[aria-checked='true'] .moon {
		color: var(--color-slate-700);
	}
	.theme-switch:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 4px;
	}
	@media (prefers-reduced-motion: reduce) {
		.thumb {
			transition: none;
		}
	}
</style>
