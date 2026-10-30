import { vi } from 'vitest';

export function mockMotion(reduced = false) {
	const preference = new EventTarget() as MediaQueryList;
	Object.defineProperty(preference, 'matches', { value: reduced, configurable: true });
	vi.spyOn(window, 'matchMedia').mockReturnValue(preference);
	return {
		setReduced(value: boolean) {
			Object.defineProperty(preference, 'matches', { value, configurable: true });
			preference.dispatchEvent(new Event('change'));
		}
	};
}
