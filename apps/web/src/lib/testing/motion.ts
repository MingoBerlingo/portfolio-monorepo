import { vi } from 'vitest';

export function mockMotion(reduced = false) {
	const preference = new EventTarget() as MediaQueryList;
	Object.defineProperty(preference, 'matches', { value: reduced, configurable: true });
	const original = window.matchMedia.bind(window);
	vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
		query.includes('prefers-reduced-motion') ? preference : original(query)
	);
	return {
		setReduced(value: boolean) {
			Object.defineProperty(preference, 'matches', { value, configurable: true });
			preference.dispatchEvent(new Event('change'));
		}
	};
}
