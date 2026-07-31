import sanitizeHtml from 'sanitize-html';

export function sanitize(dirty: string): string {
	return sanitizeHtml(dirty, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat([
			'img',
			'figure',
			'figcaption',
			'video',
			'source'
		]),
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			img: ['src', 'alt', 'width', 'height', 'loading'],
			video: [
				'src',
				'poster',
				'width',
				'height',
				'preload',
				'autoplay',
				'muted',
				'loop',
				'playsinline',
				'controls'
			],
			source: ['src', 'type']
		}
	});
}
