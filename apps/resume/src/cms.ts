import type { Locale } from "./types.ts";
export const locales: readonly string[] = ["en", "it"];

export function validateLocale(locale: unknown): asserts locale is Locale {
  if (typeof locale !== "string" || !locales.includes(locale))
    throw new Error(`Unsupported locale: ${locale}. Use en or it.`);
}

/** Reads only; never changes CMS content. Locale fallback is deliberately disabled. */
export async function readResume({
  baseURL = "http://localhost:3000",
  locale,
  token,
  cookie,
  fetcher = fetch,
}: {
  baseURL?: string;
  locale: Locale;
  token?: string;
  cookie?: string;
  fetcher?: typeof fetch;
}) {
  validateLocale(locale);
  const base = new URL(baseURL);
  if (!["http:", "https:"].includes(base.protocol))
    throw new Error("CMS URL must use HTTP or HTTPS.");
  if (base.username || base.password)
    throw new Error("Use CMS_TOKEN rather than credentials in the URL.");
  if (
    token &&
    base.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
  ) {
    throw new Error("Use HTTPS when sending a CMS token to a remote host.");
  }
  const get = async (path: string, page?: number): Promise<unknown> => {
    const url = new URL(
      `${base.pathname.replace(/\/$/, "")}/api/${path}`,
      base.origin,
    );
    url.search = new URLSearchParams({
      locale,
      "fallback-locale": "none",
      depth: "0",
      ...(page
        ? {
            page: String(page),
            limit: "100",
            sort:
              path === "experiences" || path === "education"
                ? "-startDate"
                : path === "research"
                  ? "-date"
                  : "-createdAt",
          }
        : {}),
    }).toString();
    const response = await fetcher(url, {
      headers: {
        ...(token ? { Authorization: `JWT ${token}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(
        `CMS request ${path} failed (${response.status}). Check CMS access and CMS_TOKEN.`,
      );
    return response.json();
  };
  const collection = async (slug: string) => {
    const docs: unknown[] = [];
    let page = 1;
    while (true) {
      const result = await get(slug, page);
      if (!result || typeof result !== "object")
        throw new Error(`Invalid CMS collection response: ${slug}`);
      const data = result as Record<string, unknown>;
      if (!Array.isArray(data.docs))
        throw new Error(`Invalid CMS collection response: ${slug}`);
      docs.push(...data.docs);
      if (!data.hasNextPage) return docs;
      if (
        typeof data.nextPage !== "number" ||
        !Number.isInteger(data.nextPage) ||
        data.nextPage <= page
      )
        throw new Error(`Invalid pagination for ${slug}`);
      page = data.nextPage;
    }
  };
  const [profile, experiences, education, publications, research] =
    await Promise.all([
      get("globals/profile"),
      collection("experiences"),
      collection("education"),
      collection("publications"),
      collection("research"),
    ]);
  return { profile, experiences, education, publications, research };
}
