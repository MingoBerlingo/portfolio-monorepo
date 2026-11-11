import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MediaFrame from './MediaFrame.svelte';
import '../../app.css';

it('reserves video space before the loading action hydrates', () => {
	render(MediaFrame, {
		asset: { url: '/clip.webm', width: 1280, height: 720 },
		video: true,
		class: 'block aspect-video w-full'
	});
	const video = document.querySelector('video[data-deferred]')!;
	expect(video.getBoundingClientRect().height).toBeGreaterThan(0);
	expect(video.getAttribute('src')).toBeNull();
});

it('can reveal a cover immediately without opacity transitions', () => {
	render(MediaFrame, {
		asset: { url: '/cover.jpg', width: 1280, height: 720 },
		instant: true,
		class: 'block aspect-video w-full'
	});
	const frame = document.querySelector<HTMLElement>('[data-media]')!;
	frame.dataset.mediaState = 'ready';
	const image = frame.querySelector('img')!;
	expect(getComputedStyle(image).transitionDuration).toBe('0s');
});

it('hides the high-res image before the loading action attaches', () => {
	render(MediaFrame, {
		asset: { url: '/progressive.jpg', width: 1280, height: 720 },
		class: 'block aspect-video w-full'
	});
	const frame = document.querySelector<HTMLElement>('[data-media]')!;
	expect(frame.dataset.mediaState).toBe('loading');
	expect(getComputedStyle(frame.querySelector('img')!).opacity).toBe('0');
	expect(getComputedStyle(frame, '::after').animationName).toBe('media-shimmer');
});

it('preserves the card scale transition alongside loading opacity', () => {
	render(MediaFrame, {
		asset: { url: '/cover.jpg', width: 1280, height: 720 },
		class: 'block aspect-video w-full transition-transform motion-base'
	});
	const frame = document.querySelector<HTMLElement>('[data-media]')!;
	frame.style.setProperty('--motion-duration-interactive', '300ms');
	frame.dataset.mediaState = 'ready';
	const style = getComputedStyle(frame.querySelector('img')!);
	expect(style.transitionProperty.split(',').map((value) => value.trim())).toContain('scale');
	expect(style.transitionDuration.split(',').map((value) => value.trim())).toContain('0.3s');
});
