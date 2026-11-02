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

it('starts settled without a drop and restores the static layout when reduced motion is enabled', async () => {
	const motion = mockMotion(false);
	const request = vi.spyOn(window, 'requestAnimationFrame');
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
	expect(request).not.toHaveBeenCalled();
	const position = root.querySelector('li')!.style.transform;
	root.querySelector('button')!.click();
	await vi.waitFor(() => expect(root.querySelector('li')!.style.transform).not.toBe(position));
	motion.setReduced(true);
	expect(root.dataset.physics).toBeUndefined();
	expect(root.querySelector('li')!.style.transform).toBe('');
	expect(root.querySelector('button')!.disabled).toBe(true);
});

it('keeps a tossed chip inside the visible scene, including its rotated bounds', async () => {
	mockMotion(false);
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	root = document.createElement('ul');
	root.style.cssText = 'width:240px;height:100px;position:relative;margin:0;padding:0';
	root.innerHTML =
		'<li style="position:absolute;left:0;top:0;display:inline-block"><button style="width:100px;height:40px">React</button></li>';
	document.body.append(root);
	cleanup = (chipPhysics(root, true) as { destroy: () => void }).destroy;
	await vi.waitFor(() => expect(root.dataset.physics).toBe('true'), { timeout: 5000 });
	root.querySelector('button')!.click();
	const item = root.querySelector('li')!;
	const first = item.style.transform;
	await vi.waitFor(() => expect(item.style.transform).not.toBe(first));
	const chip = item.getBoundingClientRect();
	const bounds = root.getBoundingClientRect();
	expect(chip.left).toBeGreaterThanOrEqual(bounds.left - 1);
	expect(chip.right).toBeLessThanOrEqual(bounds.right + 1);
	expect(chip.top).toBeGreaterThanOrEqual(bounds.top - 1);
	expect(chip.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
});

it('lets mouse movement push a sleeping chip without a click', async () => {
	mockMotion(false);
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	vi.spyOn(Math, 'random').mockReturnValue(0.5);
	const frames = new Map<number, FrameRequestCallback>();
	let id = 0;
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		frames.set(++id, callback);
		return id;
	});
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frame) => {
		frames.delete(frame);
	});
	root = document.createElement('ul');
	root.style.cssText = 'width:600px;height:300px;position:relative;margin:0;padding:0';
	root.innerHTML =
		'<li style="position:absolute;left:0;top:0;display:inline-block"><button style="width:100px;height:40px">Svelte</button></li>';
	document.body.append(root);
	cleanup = (chipPhysics(root, true) as { destroy: () => void }).destroy;
	await vi.waitFor(() => expect(root.dataset.physics).toBe('true'), { timeout: 5000 });
	let time = performance.now();
	const advance = (count: number) => {
		for (let step = 0; step < count; step++) {
			time += 1000 / 60;
			const pending = [...frames.values()];
			frames.clear();
			pending.forEach((callback) => callback(time));
		}
	};
	advance(240);
	const item = root.querySelector('li')!;
	const before = item.style.transform;
	const rect = item.getBoundingClientRect();
	root.dispatchEvent(
		new PointerEvent('pointermove', {
			pointerType: 'mouse',
			clientX: rect.left + 8,
			clientY: rect.top + rect.height / 2,
			bubbles: true
		})
	);
	advance(20);
	expect(item.style.transform).not.toBe(before);
	advance(360);
	expect(frames.size).toBe(0);
});

it('preserves chip rotation and size on a resize instead of spawning a new pile', async () => {
	mockMotion(false);
	vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
	const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
	root = document.createElement('ul');
	root.style.cssText = 'width:600px;height:300px;position:relative;margin:0;padding:0';
	root.innerHTML =
		'<li style="position:absolute;display:inline-block"><button style="width:100px;height:40px">Svelte</button></li>';
	document.body.append(root);
	cleanup = (chipPhysics(root, true) as { destroy: () => void }).destroy;
	await vi.waitFor(() => expect(root.dataset.physics).toBe('true'), { timeout: 5000 });
	const item = root.querySelector('li')!;
	const initialTransform = item.style.transform;
	const rotation = initialTransform.match(/rotate\(([^)]+)\)/)?.[1];
	const initialWidth = item.style.width;
	random.mockReturnValue(0.1);
	root.style.width = '800px';
	await vi.waitFor(() => expect(item.style.transform).not.toBe(initialTransform));
	expect(item.style.transform.match(/rotate\(([^)]+)\)/)?.[1]).toBe(rotation);
	expect(item.style.width).toBe(initialWidth);
});
