<script module lang="ts">
	let activeTransition: ViewTransition | undefined;
	let revealAnimation: Animation | undefined;
	let revision = 0;
</script>

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
		const current = ++revision;
		activeTransition?.skipTransition();
		revealAnimation?.cancel();
		const next = !dark;
		dark = next;
		const apply = async () => {
			if (current !== revision) return;
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
			delete root.dataset.themeTransition;
			return;
		}
		const button = event.currentTarget as HTMLButtonElement;
		const bounds = button.getBoundingClientRect();
		const x = bounds.left + bounds.width / 2;
		const y = bounds.top + bounds.height / 2;
		const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
		root.dataset.themeTransition = 'true';
		let transition: ViewTransition | undefined;
		try {
			transition = document.startViewTransition(apply);
			activeTransition = transition;
			// A skipped transition still applies the selected theme.
			void transition.finished.catch(() => {});
			await transition.ready;
			if (current !== revision) return;
			revealAnimation = root.animate(
				{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
				{
					duration: 450,
					easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
					pseudoElement: '::view-transition-new(root)'
				}
			);
			await revealAnimation.finished;
			// Keep UA fades disabled until the snapshot overlay has been removed.
			await transition.finished;
		} catch {
			/* A skipped snapshot needs no animation fallback. */
		} finally {
			await transition?.finished.catch(() => {});
			if (current === revision) {
				delete root.dataset.themeTransition;
				activeTransition = undefined;
				revealAnimation = undefined;
			}
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
	<span class="thumb" aria-hidden="true"></span>
</button>

<style>
	.theme-switch {
		--rocker-face: light-dark(var(--color-zinc-50), var(--color-zinc-800));
		--rocker-shade: light-dark(var(--color-zinc-100), #222222);
		position: relative;
		width: 52px;
		height: 28px;
		flex-shrink: 0;
		border: 0;
		border-radius: 11px;
		background: light-dark(var(--color-zinc-200), var(--color-zinc-950));
		box-shadow:
			inset 0 1px 3px light-dark(rgb(0 0 0 / 12%), rgb(0 0 0 / 50%)),
			0 1px 1px light-dark(rgb(255 255 255 / 90%), rgb(255 255 255 / 18%));
		cursor: pointer;
	}
	.thumb {
		position: absolute;
		inset: 2px;
		border-radius: 9px;
		background: linear-gradient(90deg, var(--rocker-face) 0 49.5%, var(--rocker-shade) 50% 100%);
		box-shadow:
			-2px 2px 3px light-dark(rgb(0 0 0 / 10%), rgb(0 0 0 / 28%)),
			inset 0 1px 1px light-dark(rgb(255 255 255 / 80%), rgb(255 255 255 / 18%)),
			inset 0 -1px 1px light-dark(rgb(0 0 0 / 5%), rgb(0 0 0 / 20%));
		transform: perspective(160px) rotateY(-16deg);
		transition:
			transform 180ms var(--motion-ease-interactive),
			box-shadow 180ms var(--motion-ease-interactive);
	}
	.thumb::after {
		content: '';
		position: absolute;
		inset: 1px auto 1px 50%;
		width: 1px;
		background: light-dark(rgb(0 0 0 / 2%), rgb(0 0 0 / 5%));
	}
	.theme-switch[aria-checked='true'] .thumb {
		transform: perspective(160px) rotateY(16deg);
		box-shadow:
			2px 2px 3px light-dark(rgb(0 0 0 / 12%), rgb(0 0 0 / 40%)),
			inset 0 1px 1px light-dark(rgb(255 255 255 / 80%), rgb(255 255 255 / 18%)),
			inset 0 -1px 1px light-dark(rgb(0 0 0 / 5%), rgb(0 0 0 / 20%));
		background: linear-gradient(90deg, var(--rocker-shade) 0 49.5%, var(--rocker-face) 50% 100%);
	}
	:global(html[data-theme-transition]) .thumb {
		transition: none;
	}
	.theme-switch:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 5px;
	}
	@media (prefers-reduced-motion: reduce) {
		.thumb {
			transition: none;
		}
	}
</style>
