/** Operates only on sanitized HTML, after CMS media URLs have been localized. */
export function prepareMediaHtml(html: string): string {
	return html.replace(/<img\b[^>]*>|<video\b[^>]*>[\s\S]*?<\/video>/gi, (original) => {
		const previewValue = /\sdata-preview="([^"]*)"/.exec(original)?.[1] ?? '';
		const preview = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(previewValue)
			? `<img data-preview src="${previewValue}" alt="" aria-hidden="true" class="media-preview" />`
			: '';
		let media = original.replace(/\sdata-preview="[^"]*"/g, '');
		if (/^<video\b/i.test(media)) {
			if (preview)
				media = media
					.replace(/\sposter="[^"]*"/g, '')
					.replace('<video', `<video poster="${previewValue}"`);
			const fallback = media
				.replace(/\sautoplay(?:="[^"]*")?/g, '')
				.replace(/\spreload="[^"]*"/g, '')
				.replace('<video', '<video controls preload="none"');
			media = media
				.replace(/\ssrc=/g, ' data-src=')
				.replace(/\sautoplay(?:="[^"]*")?/g, ' data-autoplay')
				.replace(/\spreload="[^"]*"/g, '');
			media = media.replace('<video', '<video data-deferred preload="none"');
			return `<div data-media data-media-state="loading" class="media-frame">${preview}${media}<noscript>${fallback}</noscript></div>`;
		}
		if (!/\sloading=/.test(media)) media = media.replace('<img', '<img loading="lazy"');
		return `<span data-media data-media-state="loading" class="media-frame">${preview}${media}</span>`;
	});
}
