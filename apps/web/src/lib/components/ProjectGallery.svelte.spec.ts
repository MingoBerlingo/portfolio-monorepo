import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProjectGallery from './ProjectGallery.svelte';

it('opens project media in order, excludes previews and suggestions, and restores focus on close', async () => {
	const root = document.createElement('article');
	const source = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>');
	root.innerHTML = `
		<figure><div data-media><img src="${source}" alt="Cover" /></div></figure>
		<div id="content">
			<span data-media><img data-preview src="${source}" alt="" /><img src="${source}" alt="Detail" /></span>
			<div data-media><video data-src="/demo.mp4"></video><noscript><video src="/demo.mp4"></video></noscript></div>
		</div>
		<section><div data-media><img src="${source}" alt="Suggested project" /></div></section>
	`;
	document.body.append(root);
	const view = render(ProjectGallery, { root });
	try {
		await vi.waitFor(() => expect(root.querySelectorAll('.project-media-open')).toHaveLength(3));
		const trigger = root.querySelectorAll<HTMLButtonElement>('.project-media-open')[1];
		trigger.click();
		const dialog = document.querySelector<HTMLDialogElement>('.project-gallery')!;
		await vi.waitFor(() => expect(dialog.open).toBe(true));
		expect(dialog.querySelector<HTMLImageElement>('.gallery-media img')?.alt).toBe('Detail');
		expect(dialog.textContent).toContain('2 / 3');
		expect(dialog.querySelectorAll('.gallery-thumbnail')).toHaveLength(3);
		dialog.querySelector<HTMLButtonElement>('.gallery-next')!.click();
		await vi.waitFor(() => expect(dialog.querySelector('.gallery-media video')?.getAttribute('src')).toBe('/demo.mp4'));
		const video = dialog.querySelector<HTMLVideoElement>('.gallery-media video')!;
		expect(video.autoplay).toBe(true);
		expect(video.loop).toBe(true);
		dialog.querySelector<HTMLButtonElement>('.gallery-thumbnail')!.click();
		await vi.waitFor(() => expect(dialog.querySelector<HTMLImageElement>('.gallery-media img')?.alt).toBe('Cover'));
		dialog.querySelector<HTMLButtonElement>('[aria-label="Close gallery"]')!.click();
		await vi.waitFor(() => expect(dialog.open).toBe(false));
		expect(document.activeElement).toBe(trigger);
	} finally {
		await view.unmount();
		root.remove();
	}
});
