import type { Action } from 'svelte/action';
import type { Body, Constraint, Engine } from 'matter-js';

/** A lazy, sleeping physics world; DOM chips remain readable without JavaScript. */
export const chipPhysics: Action<HTMLElement, boolean> = (node, active) => {
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const items = Array.from(node.querySelectorAll<HTMLElement>('li'));
	const buttons = items.map((item) => item.querySelector('button')!);
	let matter: typeof import('matter-js') | undefined;
	let engine: Engine | undefined;
	let bodies: Body[] = [];
	let sizes: { width: number; height: number }[] = [];
	let drag: Constraint | undefined;
	let pointer: number | undefined;
	let frame = 0;
	let disposed = false;
	let loading = false;
	let last = 0;
	let accumulated = 0;
	let width = 0;
	let height = 0;
	let floorY = 0;

	const stop = () => {
		cancelAnimationFrame(frame);
		frame = 0;
		last = 0;
		accumulated = 0;
	};
	const release = () => {
		if (drag && engine && matter) matter.Composite.remove(engine.world, drag);
		drag = undefined;
		if (pointer !== undefined && node.hasPointerCapture(pointer))
			node.releasePointerCapture(pointer);
		pointer = undefined;
	};
	const reset = () => {
		stop();
		release();
		if (engine && matter) {
			matter.Composite.clear(engine.world, false);
			matter.Engine.clear(engine);
		}
		engine = undefined;
		bodies = [];
		delete node.dataset.physics;
		buttons.forEach((button) => {
			button.disabled = true;
		});
		items.forEach((item) => {
			item.style.transform = '';
			item.style.width = '';
		});
	};
	const draw = () => {
		bodies.forEach((body, index) => {
			const item = items[index];
			item.style.transform = `translate3d(${body.position.x - sizes[index].width / 2}px, ${body.position.y - sizes[index].height / 2}px, 0) rotate(${body.angle}rad)`;
		});
	};
	const tick = (now: number) => {
		frame = 0;
		if (!engine || !matter || !active || motion.matches || document.hidden) return;
		accumulated += last ? Math.min(now - last, 50) : 1000 / 60;
		last = now;
		while (accumulated >= 1000 / 60) {
			matter.Engine.update(engine, 1000 / 60);
			accumulated -= 1000 / 60;
		}
		// Keep fast throws and dragging inside the visible world, even if a
		// constraint moves a body through a wall between physics steps.
		for (const body of bodies) {
			const halfWidth = (body.bounds.max.x - body.bounds.min.x) / 2;
			const halfHeight = (body.bounds.max.y - body.bounds.min.y) / 2;
			const x = Math.max(halfWidth, Math.min(width - halfWidth, body.position.x));
			const y = Math.max(halfHeight, Math.min(floorY - halfHeight, body.position.y));
			if (x !== body.position.x || y !== body.position.y) {
				matter.Body.setVelocity(body, {
					x: x !== body.position.x ? 0 : body.velocity.x,
					y: y !== body.position.y ? 0 : body.velocity.y
				});
				matter.Body.setPosition(body, { x, y });
			}
		}
		draw();
		if (drag || bodies.some((body) => !body.isSleeping)) frame = requestAnimationFrame(tick);
		else last = 0;
	};
	const wake = () => {
		if (!frame && active && !motion.matches && !document.hidden && engine)
			frame = requestAnimationFrame(tick);
	};
	const build = () => {
		if (!matter || !items.length) return;
		reset();
		width = node.clientWidth;
		height = node.clientHeight;
		if (!width || !height) return;
		const origin = node.getBoundingClientRect().top;
		const footer = node.closest('footer');
		const floor = footer?.querySelector<HTMLElement>('[data-chip-floor]');
		const start = footer?.querySelector<HTMLElement>('[data-chip-start]');
		floorY = floor ? Math.min(height, floor.getBoundingClientRect().top - origin - 12) : height;
		const spawnY = start ? Math.max(0, start.getBoundingClientRect().top - origin) : 0;
		sizes = items.map((item) => ({
			width: Math.min(Math.ceil(item.getBoundingClientRect().width) + 1, width - 16),
			height: Math.ceil(item.getBoundingClientRect().height)
		}));
		engine = matter.Engine.create({ enableSleeping: true });
		engine.gravity.y = 0.8;
		const walls = [
			matter.Bodies.rectangle(
				width / 2,
				floorY + (height - floorY + 50) / 2,
				width + 100,
				height - floorY + 50,
				{ isStatic: true }
			),
			matter.Bodies.rectangle(-25, height / 2, 50, height + 200, { isStatic: true }),
			matter.Bodies.rectangle(width + 25, height / 2, 50, height + 200, { isStatic: true }),
			matter.Bodies.rectangle(width / 2, -25, width + 100, 50, { isStatic: true })
		];
		const columns = width < 600 ? 2 : 4;
		bodies = items.map((item, index) => {
			const size = sizes[index];
			item.style.width = `${size.width}px`;
			const x = Math.min(
				width - size.width / 2 - 4,
				Math.max(size.width / 2 + 4, (((index % columns) + 0.5) * width) / columns)
			);
			const body = matter!.Bodies.rectangle(
				x,
				Math.min(floorY - size.height / 2, spawnY + 28 + Math.floor(index / columns) * 50),
				size.width,
				size.height,
				{
					chamfer: { radius: Math.min(size.height / 2, 18) },
					restitution: 0.45,
					friction: 0.35,
					frictionAir: 0.025,
					angle: ((index % 3) - 1) * 0.08,
					sleepThreshold: 50
				}
			);
			matter!.Body.setVelocity(body, { x: index % 2 ? 1.2 : -1.2, y: 0 });
			return body;
		});
		matter.Composite.add(engine.world, [...walls, ...bodies]);
		node.dataset.physics = 'true';
		buttons.forEach((button) => {
			button.disabled = false;
		});
		draw();
		wake();
	};
	const sync = async () => {
		if (motion.matches) {
			reset();
			return;
		}
		if (!active || document.hidden) {
			stop();
			release();
			return;
		}
		if (engine) {
			wake();
			return;
		}
		if (loading || !items.length) return;
		loading = true;
		try {
			const module = await import('matter-js');
			await document.fonts.ready;
			if (disposed || !active || motion.matches) return;
			matter = module.default;
			build();
		} catch (error) {
			console.warn('Footer physics unavailable', error);
			reset();
		} finally {
			loading = false;
		}
	};
	const point = (event: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		const body = drag?.bodyB;
		const halfWidth = body ? (body.bounds.max.x - body.bounds.min.x) / 2 : 0;
		const halfHeight = body ? (body.bounds.max.y - body.bounds.min.y) / 2 : 0;
		return {
			x: Math.max(halfWidth, Math.min(width - halfWidth, event.clientX - rect.left)),
			y: Math.max(halfHeight, Math.min(floorY - halfHeight, event.clientY - rect.top))
		};
	};
	const down = (event: PointerEvent) => {
		if (!engine || !matter || motion.matches || event.button !== 0 || pointer !== undefined) return;
		const button = (event.target as Element).closest('button');
		const index = buttons.indexOf(button as HTMLButtonElement);
		if (index < 0) return;
		const body = bodies[index];
		const location = point(event);
		matter.Sleeping.set(body, false);
		drag = matter.Constraint.create({
			bodyB: body,
			pointA: location,
			pointB: { x: location.x - body.position.x, y: location.y - body.position.y },
			stiffness: 0.15,
			damping: 0.15,
			length: 0
		});
		matter.Composite.add(engine.world, drag);
		pointer = event.pointerId;
		node.setPointerCapture(pointer);
		wake();
	};
	const move = (event: PointerEvent) => {
		if (drag && event.pointerId === pointer) {
			drag.pointA = point(event);
			wake();
		}
	};
	const up = (event: PointerEvent) => {
		if (event.pointerId === pointer) {
			release();
			wake();
		}
	};
	const keyboardToss = (event: MouseEvent) => {
		if (event.detail !== 0 || !matter || !engine || motion.matches) return;
		const index = buttons.indexOf((event.target as Element).closest('button') as HTMLButtonElement);
		if (index < 0) return;
		matter.Sleeping.set(bodies[index], false);
		matter.Body.setVelocity(bodies[index], { x: index % 2 ? 3 : -3, y: -7 });
		wake();
	};
	const observer = new ResizeObserver(() => {
		if (
			engine &&
			(Math.abs(node.clientWidth - width) > 1 || Math.abs(node.clientHeight - height) > 1)
		)
			build();
	});
	observer.observe(node);
	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', up);
	node.addEventListener('lostpointercapture', up);
	node.addEventListener('click', keyboardToss);
	const changed = () => {
		void sync();
	};
	motion.addEventListener('change', changed);
	document.addEventListener('visibilitychange', changed);
	void sync();
	return {
		update(next) {
			active = next;
			void sync();
		},
		destroy() {
			disposed = true;
			reset();
			observer.disconnect();
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('lostpointercapture', up);
			node.removeEventListener('click', keyboardToss);
			motion.removeEventListener('change', changed);
			document.removeEventListener('visibilitychange', changed);
		}
	};
};
