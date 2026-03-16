import sanitizeHtml from 'sanitize-html';

export function sanitize(dirty: string): string {
	return sanitizeHtml(dirty, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption']),
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			img: ['src', 'alt', 'width', 'height', 'loading']
		}
	});
}
