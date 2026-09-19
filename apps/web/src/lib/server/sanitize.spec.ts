import { describe, expect, it } from 'vitest';
import { sanitize } from './sanitize';

describe('sanitize', () => {
	it('keeps the media-layout hooks and the images inside them', () => {
		const html = sanitize(
			'<div class="media-layout"><div class="media-layout-row media-layout-row--columns-2"><img src="/media/a.jpg" alt="A" width="1200" height="800" loading="lazy" /></div></div>'
		);

		expect(html).toBe(
			'<div class="media-layout"><div class="media-layout-row media-layout-row--columns-2"><img src="/media/a.jpg" alt="A" width="1200" height="800" loading="lazy" /></div></div>'
		);
	});

	it('still strips scripts and event handlers', () => {
		const html = sanitize(
			'<div class="media-layout" onclick="alert(1)"><script>alert(1)</script></div>'
		);

		expect(html).toContain('media-layout');
		expect(html).not.toContain('onclick');
		expect(html).not.toContain('script');
	});
});
