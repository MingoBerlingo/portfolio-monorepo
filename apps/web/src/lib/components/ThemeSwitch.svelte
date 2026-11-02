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
		const button = event.currentTarget as HTMLButtonElement;
		const bounds = button.getBoundingClientRect();
		const x = bounds.left + bounds.width / 2;
		const y = bounds.top + bounds.height / 2;
		const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
		root.dataset.themeTransition = 'true';
		try {
			// Move the live knob before the page snapshot freezes its appearance.
			dark = next;
			await tick();
			const knob = button.querySelector<HTMLElement>('.thumb')!;
			await knob.animate(
				{
					transform: next
						? ['translateX(0px)', 'translateX(32px)']
						: ['translateX(32px)', 'translateX(0px)']
				},
				{ duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
			).finished;
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
			// Keep UA fades disabled until the snapshot overlay has been removed.
			await transition.finished;
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
		/* Custom charcoal tones preserve the tuned dark appearance. */
		--switch-track: light-dark(var(--color-zinc-100), #151515);
		--switch-thumb-top: light-dark(var(--color-white), #222222);
		--switch-thumb-bottom: light-dark(var(--color-zinc-100), #1c1c1c);
		--switch-track-shadow: light-dark(
			color-mix(in srgb, var(--color-black) 10%, transparent),
			color-mix(in srgb, var(--color-black) 50%, transparent)
		);
		--switch-track-highlight: light-dark(
			color-mix(in srgb, var(--color-white) 10%, transparent),
			color-mix(in srgb, var(--color-white) 1%, transparent)
		);
		--switch-track-rim: light-dark(
			color-mix(in srgb, var(--color-white) 0%, transparent),
			color-mix(in srgb, var(--color-white) 10%, transparent)
		);
		--switch-thumb-shadow: light-dark(
			color-mix(in srgb, var(--color-black) 18%, transparent),
			color-mix(in srgb, var(--color-black) 35%, transparent)
		);
		--switch-thumb-highlight: light-dark(
			color-mix(in srgb, var(--color-white) 90%, transparent),
			color-mix(in srgb, var(--color-white) 10%, transparent)
		);
		--switch-thumb-shade: light-dark(
			color-mix(in srgb, var(--color-black) 4%, transparent),
			color-mix(in srgb, var(--color-black) 15%, transparent)
		);

		position: relative;
		width: 68px;
		height: 36px;
		flex-shrink: 0;
		border-radius: 999px;
		border: 0;
		background: var(--switch-track);
		box-shadow:
			inset 1px 0 8px var(--switch-track-shadow),
			inset 11px -5px 14px var(--switch-track-highlight),
			0 -1px 0 var(--switch-track-rim);
		cursor: pointer;
	}
	svg {
		position: absolute;
		top: 10px;
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
		top: 3px;
		left: 3px;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: linear-gradient(145deg, var(--switch-thumb-top), var(--switch-thumb-bottom) 65%);
		border: 0;
		box-shadow:
			0 1px 4px var(--switch-thumb-shadow),
			inset 0 0 1px var(--switch-thumb-highlight),
			inset 0 -1px 2px var(--switch-thumb-shade);
		transition: transform 200ms var(--motion-ease-interactive);
	}
	:global(html[data-theme-transition]) .thumb {
		transition: none;
	}
	.theme-switch[aria-checked='true'] .thumb {
		transform: translateX(32px);
	}
	.theme-switch[aria-checked='false'] .sun,
	.theme-switch[aria-checked='true'] .moon {
		color: light-dark(var(--color-slate-700), var(--color-zinc-50));
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
