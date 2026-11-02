import type { Action } from 'svelte/action';

/** A short pointer-only accent. Original text remains the layout and accessible label. */
export const scrambleHover: Action<HTMLElement> = (node) => {
	const anchor = node.closest('a');
	const original = node.querySelector<HTMLElement>('.scramble-original');
	const output = node.querySelector<HTMLElement>('.scramble-output');
	if (!anchor || !original || !output) return;
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
	const glyphs = '+*/\\';
	let frame = 0;
	const reset = () => {
		cancelAnimationFrame(frame);
		frame = 0;
		delete node.dataset.active;
		output.textContent = '';
	};
	const start = (event: PointerEvent) => {
		if (
			event.pointerType !== 'mouse' ||
			!hover.matches ||
			motion.matches ||
			anchor.matches(':focus-visible') ||
			frame
		)
			return;
		const characters = Array.from(original.textContent ?? '');
		const started = performance.now();
		let lastTick = -1;
		node.dataset.active = 'true';
		const update = (now: number) => {
			const elapsed = now - started;
			if (elapsed >= 200) {
				reset();
				return;
			}
			const tick = Math.floor(elapsed / 32);
			if (tick !== lastTick) {
				lastTick = tick;
				const resolved = Math.floor((elapsed / 200) * characters.length);
				output.textContent = characters
					.map((character, index) =>
						index < resolved || !/[\p{L}\p{N}]/u.test(character)
							? character
							: glyphs[Math.floor(Math.random() * glyphs.length)]
					)
					.join('');
			}
			frame = requestAnimationFrame(update);
		};
		update(started);
	};
	anchor.addEventListener('pointerenter', start);
	anchor.addEventListener('pointerdown', reset);
	anchor.addEventListener('focus', reset);
	motion.addEventListener('change', reset);
	hover.addEventListener('change', reset);
	return {
		destroy() {
			reset();
			anchor.removeEventListener('pointerenter', start);
			anchor.removeEventListener('pointerdown', reset);
			anchor.removeEventListener('focus', reset);
			motion.removeEventListener('change', reset);
			hover.removeEventListener('change', reset);
		}
	};
};

/** Enhance links inside sanitized CMS HTML, whose text nodes are not Svelte-owned. */
export const scrambleExternalLinks: Action<HTMLElement> = (root) => {
	const cleanups: Array<() => void> = [];
	root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
		if (!['http:', 'https:', 'mailto:', 'tel:'].includes(anchor.protocol)) return;
		if (anchor.origin === window.location.origin) return;
		const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
		const nodes: Text[] = [];
		while (walker.nextNode()) {
			const text = walker.currentNode as Text;
			if (
				text.textContent?.trim() &&
				!text.parentElement?.closest('svg, [aria-hidden="true"], .sr-only, .scramble-label')
			)
				nodes.push(text);
		}
		for (const text of nodes) {
			const label = document.createElement('span');
			label.className = 'scramble-label';
			const original = document.createElement('span');
			original.className = 'scramble-original';
			const output = document.createElement('span');
			output.className = 'scramble-output';
			output.setAttribute('aria-hidden', 'true');
			// Keep boundary whitespace in the surrounding inline flow. Whitespace
			// inside an inline-block would be trimmed and join formatted words.
			const leading = document.createTextNode(text.data.match(/^\s*/)?.[0] ?? '');
			const trailing = document.createTextNode(text.data.match(/\s*$/)?.[0] ?? '');
			text.replaceWith(leading, label, trailing);
			original.textContent = text.data.trim();
			label.append(original, output);
			const action = scrambleHover(label) as { destroy?: () => void } | undefined;
			cleanups.push(() => {
				action?.destroy?.();
				leading.replaceWith(text);
				label.remove();
				trailing.remove();
			});
		}
	});
	return {
		destroy() {
			cleanups.forEach((cleanup) => cleanup());
		}
	};
};
