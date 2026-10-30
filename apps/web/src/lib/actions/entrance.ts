import type { Action } from 'svelte/action';

/** Block-level page entry. Unmarked content and the persistent header stay stable. */
export const entrance: Action<HTMLElement> = (node) => {
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const style = getComputedStyle(node);
	const duration = Number.parseFloat(style.getPropertyValue('--motion-duration-enter')) || 450;
	const easing =
		style.getPropertyValue('--motion-ease-interactive').trim() || 'cubic-bezier(0.23, 1, 0.32, 1)';
	const marked = Array.from(node.querySelectorAll<HTMLElement>('[data-enter]'));
	const targets = marked.length ? marked : [node];
	const animations = targets.map((target, index) =>
		target.animate(
			motion.matches
				? [{ opacity: 0 }, { opacity: 1 }]
				: [
						{ opacity: 0, transform: 'translateY(12px)' },
						{ opacity: 1, transform: 'translateY(0)' }
					],
			{
				duration: motion.matches ? 200 : duration,
				delay: motion.matches ? 0 : index * 50,
				easing,
				fill: 'backwards'
			}
		)
	);
	const finish = () => {
		animations.forEach((animation) => animation.cancel());
	};
	motion.addEventListener('change', finish);
	return {
		destroy() {
			motion.removeEventListener('change', finish);
			finish();
		}
	};
};
