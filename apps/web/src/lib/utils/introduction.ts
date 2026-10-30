export interface IntroductionImage {
	key: string;
	src: string;
	alt: string;
}

export type IntroductionToken =
	| { text: string; image?: never }
	| { image: IntroductionImage; text?: never };

export function splitIntroduction(
	text: string,
	images: IntroductionImage[]
): IntroductionToken[][] {
	return text
		.trim()
		.split(/\n\s*\n/)
		.filter(Boolean)
		.map((paragraph) =>
			paragraph
				.split(/(\[[\w-]+\]|\s+)/)
				.filter((part) => part.trim())
				.flatMap((part): IntroductionToken[] => {
					if (/^\[[\w-]+\]$/.test(part)) {
						const image = images.find((image) => image.key === part.slice(1, -1));
						return image ? [{ image }] : [];
					}
					return [{ text: part }];
				})
		);
}
