import type { Post } from '@saiver/types';

export async function load() {
	const res = await fetch('http://localhost:3000/api/post');
	const data = await res.json();

	return { posts: data.docs as Post[] };
}
