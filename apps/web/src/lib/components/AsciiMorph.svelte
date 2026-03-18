<script lang="ts">
	/**
	 * AsciiMorph - Morphing ASCII art animation
	 *
	 * Cycles through ASCII frames with a collapse-to-center then expand-from-center
	 * transition effect. Characters crush inward line-by-line, replaced by random
	 * glyphs (+, *, /, \), then the next frame reconstructs outward.
	 */
	import { untrack } from 'svelte';
	import { defaultFrames } from './ascii-frames';

	interface Props {
		frames?: string[][];
		interval?: number; // ms between auto-cycling to the next frame
		frameDelay?: number; // ms between each animation step during a morph
	}

	let { frames = defaultFrames, interval = 3000, frameDelay = 20 }: Props = $props();

	let containerEl: HTMLPreElement | undefined = $state();
	let lines: string[] = $state([]);
	let canvasSize = { x: 60, y: 22 };
	let currentIndex = $state(0);
	let animationTimeout: ReturnType<typeof setTimeout> | undefined;
	let cycleInterval: ReturnType<typeof setInterval> | undefined;

	function repeat(pattern: string, count: number): string {
		if (count < 1) return '';
		return pattern.repeat(count);
	}

	function replaceAt(str: string, index: number, char: string): string {
		return str.substring(0, index) + char + str.substring(index + char.length);
	}

	function randomMorphChar(): string {
		const chars = '+*/\\';
		return chars[Math.floor(Math.random() * chars.length)];
	}

	/** Pads and centers ASCII art within the fixed canvas size */
	function squareOutData(data: string[]): string[] {
		const result = data.map((line) => line);
		let maxWidth = 0;

		for (const line of result) {
			if (line.length > maxWidth) maxWidth = line.length;
		}

		for (let i = 0; i < result.length; i++) {
			if (result[i].length < maxWidth) {
				result[i] = result[i] + repeat(' ', maxWidth - result[i].length);
			}
		}

		const padX = Math.floor((canvasSize.x - maxWidth) / 2);
		const padY = Math.floor((canvasSize.y - result.length) / 2);

		for (let i = 0; i < result.length; i++) {
			result[i] = repeat(' ', padX) + result[i] + repeat(' ', padX);
		}

		for (let i = 0; i < canvasSize.y; i++) {
			if (i < padY) {
				result.unshift(repeat(' ', canvasSize.x));
			} else if (i > padY + data.length) {
				result.push(repeat(' ', canvasSize.x));
			}
		}

		return result;
	}

	/** Collapses a line's outermost non-space chars inward, leaving random glyphs on the adjacent row toward center */
	function crushLine(data: string[], line: number, start: number, end: number): string[] {
		const centerY = Math.floor(canvasSize.y / 2);
		const direction = line > centerY ? -1 : 1;

		data[line] = replaceAt(data[line], start, ' ');
		data[line] = replaceAt(data[line], end, ' ');

		const targetLine = line + direction;
		if (targetLine < 0 || targetLine >= data.length) return data;

		if (!(end - 1 === start + 1) && start !== end && start + 1 !== end) {
			data[targetLine] = replaceAt(data[targetLine], start + 1, randomMorphChar());
			data[targetLine] = replaceAt(data[targetLine], end - 1, randomMorphChar());
		} else if ((start === end || start + 1 === end) && targetLine !== centerY && line !== centerY) {
			data[targetLine] = replaceAt(data[targetLine], start, randomMorphChar());
			data[targetLine] = replaceAt(data[targetLine], end, randomMorphChar());
		}

		return data;
	}

	function getMorphedFrame(data: string[]): string[] | false {
		let found = false;

		for (let i = 0; i < data.length; i++) {
			const line = data[i];
			const firstNonSpace = line.search(/\S/);
			if (firstNonSpace === -1) continue;

			let lastNonSpace = -1;
			for (let j = 0; j < line.length; j++) {
				if (line[j] !== ' ') lastNonSpace = j;
			}

			if (lastNonSpace !== -1) {
				data = crushLine(data, i, firstNonSpace, lastNonSpace);
				found = true;
			}
		}

		return found ? data : false;
	}

	/** Builds the full morph sequence: deconstruct current frame → construct target frame */
	function prepareFrames(targetData: string[]): string[][] {
		const deconstructionFrames: string[][] = [];
		const constructionFrames: string[][] = [];

		let current = untrack(() => lines).slice();
		for (let i = 0; i < 100; i++) {
			const morphed = getMorphedFrame(current);
			if (morphed === false) break;
			deconstructionFrames.push(morphed.slice());
			current = morphed;
		}

		let squared = squareOutData(targetData);
		constructionFrames.unshift(squared.slice());
		for (let i = 0; i < 100; i++) {
			const morphed = getMorphedFrame(squared);
			if (morphed === false) break;
			constructionFrames.unshift(morphed.slice());
			squared = morphed;
		}

		return deconstructionFrames.concat(constructionFrames);
	}

	function animateFrames(frameData: string[][]) {
		if (animationTimeout) clearTimeout(animationTimeout);

		let frameIndex = 0;

		function step() {
			if (frameIndex >= frameData.length) return;
			lines = frameData[frameIndex];
			frameIndex++;
			if (frameIndex < frameData.length) {
				animationTimeout = setTimeout(step, frameDelay);
			}
		}

		animationTimeout = setTimeout(step, frameDelay);
	}

	function morph(data: string[]) {
		animateFrames(prepareFrames(data.slice()));
	}

	function morphNextFrame() {
		currentIndex = (currentIndex + 1) % frames.length;
		morph(frames[currentIndex]);
	}

	$effect(() => {
		untrack(() => {
			lines = squareOutData(['']);
			morph(frames[0]);

			cycleInterval = setInterval(() => {
				morphNextFrame();
			}, interval);
		});

		return () => {
			if (animationTimeout) clearTimeout(animationTimeout);
			if (cycleInterval) clearInterval(cycleInterval);
		};
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
<pre
	bind:this={containerEl}
	class="cursor-pointer text-center font-mono text-md leading-tight text-foreground-2 select-none sm:text-lg"
	role="img"
	aria-label="Animated ASCII art showcasing design skills"
	onclick={morphNextFrame}>{lines.join('\n')}</pre>
