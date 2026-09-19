import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

const DEFAULT_CMS_URL = 'http://localhost:3000';
const DEFAULT_TTL_MS = 60_000;

function getCmsGraphqlUrl(): string {
	const base = env.CMS_API_URL || DEFAULT_CMS_URL;
	return `${base}/api/graphql`;
}

export interface PaginatedResponse<T> {
	docs: T[];
	totalDocs: number;
	totalPages: number;
	page: number;
	limit: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	nextPage: number | null;
	prevPage: number | null;
}

interface CacheEntry {
	data: unknown;
	expires: number;
}

const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expires) {
		cache.delete(key);
		return null;
	}
	return entry.data as T;
}

function setCache(key: string, data: unknown, ttl: number): void {
	cache.set(key, { data, expires: Date.now() + ttl });
}

export function invalidateCache(prefix?: string): void {
	if (!prefix) {
		cache.clear();
		return;
	}
	for (const key of cache.keys()) {
		if (key.startsWith(prefix)) {
			cache.delete(key);
		}
	}
}

export class CmsQueryError extends Error {
	constructor(
		message: string,
		public readonly errors: Array<{ message: string }>
	) {
		super(message);
		this.name = 'CmsQueryError';
	}
}

export async function cmsQuery<T>(
	query: string,
	variables?: Record<string, unknown>,
	options?: { ttl?: number }
): Promise<T> {
	const body = { query, variables };
	const cacheKey = JSON.stringify(body);
	const ttl = options?.ttl ?? DEFAULT_TTL_MS;

	// No caching in dev: an edit in the CMS has to show up on the next reload,
	// not after the TTL. Builds keep the TTL (one process renders every page).
	const cached = dev ? null : getCached<T>(cacheKey);
	if (cached) return cached;

	const res = await fetch(getCmsGraphqlUrl(), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		throw new Error(`CMS request failed: ${res.status} ${res.statusText}`);
	}

	const json: { data?: T; errors?: Array<{ message: string }> } = await res.json();

	if (json.errors?.length && !json.data) {
		throw new CmsQueryError(json.errors[0].message, json.errors);
	}

	const data = json.data as T;
	if (!dev) setCache(cacheKey, data, ttl);
	return data;
}
