export const locales = ['en', 'it'];

export function validateLocale(locale) {
  if (!locales.includes(locale)) throw new Error(`Unsupported locale: ${locale}. Use en or it.`);
}

/** Reads only; never changes CMS content. Locale fallback is deliberately disabled. */
export async function readCV({ baseURL = 'http://localhost:3000', locale, token, fetcher = fetch }) {
  validateLocale(locale);
  const base = new URL(baseURL);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('CMS URL must use HTTP or HTTPS.');
  if (base.username || base.password) throw new Error('Use CMS_TOKEN rather than credentials in the URL.');
  if (token && base.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
    throw new Error('Use HTTPS when sending a CMS token to a remote host.');
  }
  const get = async (path, page) => {
    const url = new URL(`${base.pathname.replace(/\/$/, '')}/api/${path}`, base.origin);
    url.search = new URLSearchParams({ locale, 'fallback-locale': 'none', depth: '0', ...(page ? { page: String(page), limit: '100', sort: '-startDate' } : {}) });
    const response = await fetcher(url, {
      headers: token ? { Authorization: `JWT ${token}` } : {},
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`CMS request ${path} failed (${response.status}). Check CMS access and CMS_TOKEN.`);
    return response.json();
  };
  const collection = async (slug) => {
    const docs = [];
    let page = 1;
    while (true) {
      const result = await get(slug, page);
      if (!Array.isArray(result.docs)) throw new Error(`Invalid CMS collection response: ${slug}`);
      docs.push(...result.docs);
      if (!result.hasNextPage) return docs;
      if (!Number.isInteger(result.nextPage) || result.nextPage <= page) throw new Error(`Invalid pagination for ${slug}`);
      page = result.nextPage;
    }
  };
  const [profile, curriculum, experiences, education] = await Promise.all([
    get('globals/profile'), get('globals/curriculum'), collection('experiences'), collection('education'),
  ]);
  return { profile, curriculum, experiences, education };
}
