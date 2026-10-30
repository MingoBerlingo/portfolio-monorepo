import { afterEach, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import Header from './Header.svelte';
import '../../app.css';

afterEach(() => {
	document.getAnimations().forEach((animation) => animation.cancel());
});

it('keeps menu motion off layout properties and closes with Escape', async () => {
	render(Header);
	const toggle = document.querySelector<HTMLButtonElement>('button[aria-label="Open menu"]')!;
	toggle.click();
	await tick();
	const properties = document
		.getAnimations()
		.flatMap((animation) =>
			animation.effect instanceof KeyframeEffect
				? animation.effect.getKeyframes().flatMap(Object.keys)
				: []
		);
	expect(properties).not.toContain('height');
	expect(properties).not.toContain('paddingTop');
	window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	await tick();
	expect(toggle.getAttribute('aria-expanded')).toBe('false');
});
