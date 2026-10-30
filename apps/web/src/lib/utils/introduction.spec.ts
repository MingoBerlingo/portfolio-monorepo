import { describe, expect, it } from 'vitest';
import { splitIntroduction } from './introduction';

describe('homepage introduction', () => {
	it('keeps paragraph breaks and places an image between words', () => {
		const result = splitIntroduction('Build [system] together.\n\nShip it.', [
			{ key: 'system', src: '/system.svg', alt: 'Components' }
		]);
		expect(result).toEqual([
			[
				{ text: 'Build' },
				{ image: { key: 'system', src: '/system.svg', alt: 'Components' } },
				{ text: 'together.' }
			],
			[{ text: 'Ship' }, { text: 'it.' }]
		]);
	});
	it('omits unresolved markers without losing surrounding text', () => {
		expect(splitIntroduction('A [missing] library.', [])).toEqual([
			[{ text: 'A' }, { text: 'library.' }]
		]);
	});
});
