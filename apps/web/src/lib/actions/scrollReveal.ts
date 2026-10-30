import type { Action } from 'svelte/action';

export const scrollReveal: Action<HTMLElement> = (node) => {
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	let frame = 0;
	const update = () => {
		frame = 0;
		const words = Array.from(node.querySelectorAll<HTMLElement>('[data-reveal]'));
		const height = window.innerHeight;
		const remaining = Math.max(0, document.documentElement.scrollHeight - height - window.scrollY);
		const endProgress = Math.max(0, 1 - remaining / (height * 0.25));
		const positions = words.map((word) => word.getBoundingClientRect());
		words.forEach((word, index) => {
			const rect = positions[index];
			const stagger = (rect.left / Math.max(window.innerWidth, 1)) * height * 0.16;
			const progress = motion.matches
				? 1
				: Math.max(
						endProgress,
						Math.min(1, (height * 0.88 - rect.top - stagger) / (height * 0.28))
					);
			word.style.opacity = String(0.15 + progress * 0.85);
			word.style.transform = `rotate(${(1 - progress) * 2}deg)`;
		});
	};
	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};
	const observer = new ResizeObserver(schedule);
	observer.observe(node);
	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule);
	motion.addEventListener('change', schedule);
	update();
	return {
		destroy() {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			motion.removeEventListener('change', schedule);
		}
	};
};
