<script lang="ts">
	import { onMount } from 'svelte';
	let dark = $state(false);
	onMount(() => {
		const preference = matchMedia('(prefers-color-scheme: dark)');
		const sync = () => {
			dark = document.documentElement.dataset.theme
				? document.documentElement.dataset.theme === 'dark'
				: preference.matches;
		};
		sync();
		preference.addEventListener('change', sync);
		return () => preference.removeEventListener('change', sync);
	});
	function toggle() {
		dark = !dark;
		document.documentElement.dataset.theme = dark ? 'dark' : 'light';
		try {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		} catch {
			/* Storage can be unavailable. */
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
		border: 1px solid var(--color-border-contrast);
		background: var(--color-surface-3);
		box-shadow:
			inset 0 3px 5px rgb(0 0 0 / 24%),
			inset 0 -1px 1px rgb(255 255 255 / 65%);
		cursor: pointer;
	}
	svg {
		position: absolute;
		top: 9px;
		width: 16px;
		height: 16px;
		color: var(--color-foreground-2);
		filter: drop-shadow(0 1px 0 rgb(255 255 255 / 30%));
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
		background: linear-gradient(145deg, var(--color-white), var(--color-slate-200));
		border: 1px solid var(--color-white);
		box-shadow:
			0 3px 6px rgb(0 0 0 / 28%),
			inset 0 1px 2px rgb(255 255 255 / 90%);
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
