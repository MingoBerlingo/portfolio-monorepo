import { afterEach, expect, it, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { scrambleHover, scrambleExternalLinks } from './scrambleHover';
import { mockMotion } from '$lib/testing/motion';
import '../../app.css';

let anchor: HTMLAnchorElement;
let cleanup: (() => void) | undefined;
afterEach(() => {
	cleanup?.();
	anchor?.remove();
	vi.restoreAllMocks();
});

function mount() {
	anchor = document.createElement('a');
	anchor.href = 'https://example.com/projects';
	anchor.innerHTML =
		'<span class="scramble-label"><span class="scramble-original">Projects</span><span class="scramble-output" aria-hidden="true"></span></span>';
	document.body.append(anchor);
	const label = anchor.firstElementChild as HTMLElement;
	cleanup = (scrambleHover(label) as { destroy: () => void }).destroy;
	return label;
}

it('preserves link name, destination and width, then restores immediately on pointer leave', async () => {
	mockMotion(false);
	const label = mount();
	const width = label.getBoundingClientRect().width;
	anchor.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
	expect(label.dataset.active).toBe('true');
	expect(label.querySelector('.scramble-output')?.textContent).not.toBe('Projects');
	expect(label.getBoundingClientRect().width).toBe(width);
	await expect
		.element(page.getByRole('link', { name: 'Projects', exact: true }))
		.toBeInTheDocument();
	expect(anchor.href).toBe('https://example.com/projects');
	anchor.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
	expect(label.dataset.active).toBeUndefined();
});

it('does not scramble touch or reduced-motion interactions and cancels when keyboard focus arrives', () => {
	const motion = mockMotion(false);
	const label = mount();
	anchor.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
	expect(label.dataset.active).toBeUndefined();
	anchor.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
	anchor.focus();
	expect(label.dataset.active).toBeUndefined();
	anchor.blur();
	motion.setReduced(true);
	anchor.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
	expect(label.dataset.active).toBeUndefined();
});

it('settles automatically within 200ms and does not queue repeated entries', async () => {
	mockMotion(false);
	const label = mount();
	anchor.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
	anchor.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
	await vi.waitFor(() => expect(label.dataset.active).toBeUndefined(), {
		timeout: 500,
		interval: 25
	});
	expect(label.querySelector('.scramble-original')?.textContent).toBe('Projects');
});

it('enhances CMS external text while leaving internal links and icons alone, and restores on cleanup', async () => {
	mockMotion(false);
	const root = document.createElement('div');
	root.innerHTML =
		'<a href="https://example.com/docs"><strong>Read</strong> docs<svg aria-hidden="true"><title>Icon</title></svg></a><a href="/projects">Projects</a>';
	document.body.append(root);
	anchor = root.querySelector('a')!;
	const originalWidth = anchor.getBoundingClientRect().width;
	const result = scrambleExternalLinks(root) as { destroy: () => void };
	expect(anchor.getBoundingClientRect().width).toBe(originalWidth);
	cleanup = () => {
		result.destroy();
		root.remove();
	};
	expect(anchor.querySelectorAll('.scramble-label')).toHaveLength(2);
	expect(root.querySelector('a[href="/projects"] .scramble-label')).toBeNull();
	expect(anchor.querySelector('svg .scramble-label')).toBeNull();
	await expect
		.element(page.getByRole('link', { name: 'Read docs', exact: true }))
		.toBeInTheDocument();
	result.destroy();
	expect(root.querySelector('.scramble-label')).toBeNull();
	expect(anchor.textContent).toBe('Read docsIcon');
});

it('keeps the visible space between separately formatted pieces of a CMS link', () => {
	mockMotion(false);
	const root = document.createElement('div');
	root.innerHTML = '<a href="https://example.com/docs"><strong>Read</strong> docs</a>';
	document.body.append(root);
	anchor = root.querySelector('a')!;
	const width = anchor.getBoundingClientRect().width;
	const result = scrambleExternalLinks(root) as { destroy: () => void };
	cleanup = () => {
		result.destroy();
		root.remove();
	};
	expect(anchor.getBoundingClientRect().width).toBe(width);
});
