import type { Action } from 'svelte/action';

/** Own automatic playback, including videos supplied by CMS rich text. */
export const mediaPlayback: Action<HTMLElement> = (root) => {
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const videos = new Map<HTMLVideoElement, { sync: () => void; destroy: () => void }>();
	const register = (video: HTMLVideoElement) => {
		if (videos.has(video)) return;
		const automatic = video.autoplay;
		const originalControls = video.controls;
		let visible = false;
		let userPaused = false;
		let userPlaying = false;
		let policyPause = false;
		let automaticPlay = false;
		let disposed = false;
		video.autoplay = false;
		const pause = () => {
			if (!video.paused) {
				policyPause = true;
				video.pause();
			}
		};
		const sync = () => {
			video.controls = originalControls || motion.matches;
			if (!visible || document.hidden || (motion.matches && !userPlaying)) {
				pause();
				return;
			}
			if (
				!userPaused &&
				(userPlaying || (automatic && !motion.matches)) &&
				video.paused &&
				!automaticPlay
			) {
				automaticPlay = true;
				void video
					.play()
					.catch(() => {
						if (!disposed) video.controls = true;
					})
					.finally(() => {
						automaticPlay = false;
					});
			}
		};
		const onPlay = () => {
			if (!automaticPlay) {
				userPlaying = true;
				userPaused = false;
			}
		};
		const onPause = () => {
			if (policyPause) policyPause = false;
			else {
				userPaused = true;
				userPlaying = false;
			}
		};
		video.addEventListener('play', onPlay);
		video.addEventListener('pause', onPause);
		const observer = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			sync();
		});
		observer.observe(video);
		sync();
		videos.set(video, {
			sync,
			destroy() {
				disposed = true;
				observer.disconnect();
				video.removeEventListener('play', onPlay);
				video.removeEventListener('pause', onPause);
				video.pause();
			}
		});
	};
	const scan = (node: Node) => {
		if (!(node instanceof Element)) return;
		if (node instanceof HTMLVideoElement) register(node);
		node.querySelectorAll('video').forEach(register);
	};
	scan(root);
	const mutations = new MutationObserver((records) => {
		for (const record of records) record.addedNodes.forEach(scan);
		for (const [video, state] of videos) {
			if (!root.contains(video)) {
				state.destroy();
				videos.delete(video);
			}
		}
	});
	mutations.observe(root, { childList: true, subtree: true });
	const sync = () => {
		for (const state of videos.values()) state.sync();
	};
	motion.addEventListener('change', sync);
	document.addEventListener('visibilitychange', sync);
	return {
		destroy() {
			mutations.disconnect();
			motion.removeEventListener('change', sync);
			document.removeEventListener('visibilitychange', sync);
			for (const state of videos.values()) state.destroy();
			videos.clear();
		}
	};
};
