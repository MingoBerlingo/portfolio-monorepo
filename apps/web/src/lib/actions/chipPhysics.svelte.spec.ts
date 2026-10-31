import { afterEach, expect, it, vi } from 'vitest';
import { chipPhysics } from './chipPhysics';
import { mockMotion } from '$lib/testing/motion';

let root: HTMLElement;
let cleanup: (() => void) | undefined;
afterEach(() => {
	cleanup?.();
	root?.remove();
	vi.restoreAllMocks();
});

it('keeps keywords as a readable static list for reduced motion', () => {
	mockMotion(true);
	root = document.createElement('ul');
	root.innerHTML = '<li><button>UX / UI</button></li><li><button>Svelte</button></li>';
	document.body.append(root);
	const action = chipPhysics(root, true) as { destroy: () => void };
	cleanup = action.destroy;
	expect(root.dataset.physics).not.toBe('true');
	expect(root.textContent).toBe('UX / UISvelte');
	expect(root.querySelector('li')?.style.transform).toBe('');
});

it('loads physics only when revealed and restores the static layout when reduced motion is enabled', async () => {
	const motion = mockMotion(false);
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	root = document.createElement('ul');
	root.style.cssText = 'width:600px;height:240px;position:relative';
	root.innerHTML =
		'<li style="display:inline-block"><button style="width:100px;height:40px">Svelte</button></li>';
	document.body.append(root);
	const action = chipPhysics(root, false) as {
		update: (active: boolean) => void;
		destroy: () => void;
	};
	cleanup = action.destroy;
	expect(root.dataset.physics).toBeUndefined();
	action.update(true);
	await vi.waitFor(() => expect(root.dataset.physics).toBe('true'), { timeout: 5000 });
	const position = root.querySelector('li')!.style.transform;
	await vi.waitFor(() => expect(root.querySelector('li')!.style.transform).not.toBe(position));
	motion.setReduced(true);
	expect(root.dataset.physics).toBeUndefined();
	expect(root.querySelector('li')!.style.transform).toBe('');
	expect(root.querySelector('button')!.disabled).toBe(true);
});
