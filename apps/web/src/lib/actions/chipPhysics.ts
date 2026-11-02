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
	const host = node.closest('footer') ?? node;
	const mouseRadius = 28;
	let mouseBody: Body | undefined;
	let mouseTarget: { x: number; y: number } | undefined;
	let mouseChanged = false;
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
	const clearMouse = (resume = true) => {
		const hadMouse = !!mouseTarget;
		mouseTarget = undefined;
		mouseChanged = false;
		if (mouseBody && matter) {
			matter.Body.setPosition(mouseBody, { x: -1000, y: -1000 });
			matter.Body.setVelocity(mouseBody, { x: 0, y: 0 });
		}
		if (hadMouse && matter) {
			bodies.forEach((body) => matter!.Sleeping.set(body, false));
			if (resume) wake();
		}
	};
	const advance = (delta: number) => {
		if (!engine || !matter) return;
		if (!mouseBody || !mouseTarget || drag) {
			matter.Engine.update(engine, delta);
			return;
		}
		const from = { ...mouseBody.position };
		const target = { ...mouseTarget };
		const distance = Math.hypot(target.x - from.x, target.y - from.y);
		const disturb = mouseChanged || distance > 0.1;
		// Sweep the invisible collider through the pointer's path, so a fast
		// movement pushes chips instead of teleporting through them.
		const steps = Math.min(12, Math.max(1, Math.ceil(distance / (mouseRadius * 0.6))));
		for (let step = 1; step <= steps; step++) {
			const position = {
				x: from.x + ((target.x - from.x) * step) / steps,
				y: from.y + ((target.y - from.y) * step) / steps
			};
			const velocity = {
				x: position.x - mouseBody.position.x,
				y: position.y - mouseBody.position.y
			};
			matter.Body.setPosition(mouseBody, position);
			matter.Body.setVelocity(mouseBody, velocity);
			for (const body of disturb ? bodies : []) {
				const dx = Math.max(body.bounds.min.x - position.x, 0, position.x - body.bounds.max.x);
				const dy = Math.max(body.bounds.min.y - position.y, 0, position.y - body.bounds.max.y);
				if (dx * dx + dy * dy < (mouseRadius + 8) ** 2) matter.Sleeping.set(body, false);
			}
			matter.Engine.update(engine, delta / steps);
		}
		matter.Body.setVelocity(mouseBody, { x: 0, y: 0 });
		mouseChanged = false;
	};
	const reset = () => {
		stop();
		release();
		clearMouse(false);
		mouseBody = undefined;
		if (engine && matter) {
			matter.Composite.clear(engine.world, false);
			matter.Engine.clear(engine);
		}
		engine = undefined;
		bodies = [];
		delete node.dataset.physics;
		delete node.dataset.physicsPending;
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
	const containBodies = () => {
		if (!matter) return;
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
	};
	const tick = (now: number) => {
		frame = 0;
		if (!engine || !matter || !active || motion.matches || document.hidden) return;
		accumulated += last ? Math.min(now - last, 50) : 1000 / 60;
		last = now;
		while (accumulated >= 1000 / 60) {
			advance(1000 / 60);
			accumulated -= 1000 / 60;
		}
		containBodies();
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
		// Spread starting positions evenly across the full width; keep the
		// rotations and heights varied so the settled pile still feels natural.
		const spacing = width / items.length;
		bodies = items.map((item, index) => {
			const size = sizes[index];
			item.style.width = `${size.width}px`;
			let angle = (Math.random() - 0.5) * Math.PI * 2;
			if (
				Math.abs(Math.sin(angle)) * size.width + Math.abs(Math.cos(angle)) * size.height >
				floorY - 4
			)
				angle = 0;
			const halfWidth =
				(Math.abs(Math.cos(angle)) * size.width + Math.abs(Math.sin(angle)) * size.height) / 2;
			const halfHeight =
				(Math.abs(Math.sin(angle)) * size.width + Math.abs(Math.cos(angle)) * size.height) / 2;
			const x = Math.max(halfWidth + 2, Math.min(width - halfWidth - 2, (index + 0.5) * spacing));
			const y = Math.max(
				halfHeight + 2,
				Math.min(floorY - halfHeight - 2, spawnY - 140 + Math.random() * 140)
			);
			const body = matter!.Bodies.rectangle(x, y, size.width, size.height, {
				chamfer: { radius: Math.min(size.height / 2, 18) },
				restitution: 0.3,
				friction: 0.6,
				frictionStatic: 1,
				frictionAir: 0.018,
				angle,
				sleepThreshold: 50
			});
			matter!.Body.setVelocity(body, { x: (Math.random() - 0.5) * 1.8, y: Math.random() });
			matter!.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
			return body;
		});
		mouseBody = matter.Bodies.circle(-1000, -1000, mouseRadius, {
			isStatic: true,
			friction: 0.2,
			restitution: 0.45
		});
		matter.Composite.add(engine.world, [...walls, ...bodies, mouseBody]);
		// Compute the loose pile offscreen. Revealing the footer should not
		// start an entrance animation; only pointer/keyboard interaction wakes it.
		for (let step = 0; step < 360 && bodies.some((body) => !body.isSleeping); step++) {
			matter.Engine.update(engine, 1000 / 60);
			containBodies();
		}
		for (const body of bodies) {
			matter.Body.setVelocity(body, { x: 0, y: 0 });
			matter.Body.setAngularVelocity(body, 0);
			matter.Sleeping.set(body, true);
		}
		node.dataset.physics = 'true';
		delete node.dataset.physicsPending;
		buttons.forEach((button) => {
			button.disabled = false;
		});
		draw();
	};
	const sync = async () => {
		if (motion.matches) {
			reset();
			return;
		}
		if (!engine) node.dataset.physicsPending = 'true';
		if (!active || document.hidden) {
			clearMouse(false);
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
		clearMouse(false);
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
	const hoverMove = (event: PointerEvent) => {
		if (
			event.pointerType !== 'mouse' ||
			drag ||
			!active ||
			motion.matches ||
			!engine ||
			!matter ||
			!mouseBody
		)
			return;
		const rect = node.getBoundingClientRect();
		const next = { x: event.clientX - rect.left, y: event.clientY - rect.top };
		if (next.x < 0 || next.x > width || next.y < 0 || next.y > floorY) {
			clearMouse();
			return;
		}
		mouseChanged = !mouseTarget || Math.hypot(next.x - mouseTarget.x, next.y - mouseTarget.y) > 0.1;
		if (!mouseTarget) matter.Body.setPosition(mouseBody, next);
		mouseTarget = next;
		wake();
	};
	const hoverLeave = () => clearMouse();
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
	host.addEventListener('pointermove', hoverMove);
	host.addEventListener('pointerleave', hoverLeave);
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
			host.removeEventListener('pointermove', hoverMove);
			host.removeEventListener('pointerleave', hoverLeave);
			motion.removeEventListener('change', changed);
			document.removeEventListener('visibilitychange', changed);
		}
	};
};
