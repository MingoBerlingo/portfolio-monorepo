import { expect, it } from 'vitest';
import { prepareMediaHtml } from './media-html';

it('defers sanitized video sources and provides a manual no-JS fallback', () => {
	const html = prepareMediaHtml(
		'<video src="/media/a.webm" autoplay muted width="800" height="600"></video>'
	);
	expect(html).toContain('data-src="/media/a.webm"');
	expect(html).toContain('data-autoplay');
	expect(html).toMatch(/<noscript><video[^>]* src="\/media\/a.webm"/);
	expect(html).toContain('controls');
	expect(html.split('<noscript>')[0]).not.toMatch(/\ssrc=/);
});
it('wraps ordinary images and only accepts JPEG preview data', () => {
	const html = prepareMediaHtml(
		'<img src="/media/a.jpg" alt="A" data-preview="data:image/jpeg;base64,YQ==" />'
	);
	expect(html).toContain('data-media');
	expect(html).toContain('class="media-preview"');
	expect(html).toContain('loading="lazy"');
	expect(prepareMediaHtml('<img src="/a.jpg" data-preview="javascript:alert(1)" />')).not.toContain(
		'javascript'
	);
});

it('marks source-child videos as deferred for the no-JS hiding rule', () => {
	const html = prepareMediaHtml(
		'<video autoplay><source src="/media/a.webm" type="video/webm" /></video>'
	);
	expect(html).toMatch(/<video[^>]*data-deferred/);
	expect(html).toContain('<source data-src="/media/a.webm"');
	expect(html).toMatch(/<noscript><video[^>]*><source src="\/media\/a.webm"/);
});

it('emits the loading state in HTML before JavaScript runs', () => {
	const html = prepareMediaHtml('<img src="/media/progressive.jpg" width="800" height="600" />');
	expect(html).toContain('data-media-state="loading"');
});
