export function requestViolation(request: Request): string | null {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host))
    return "Use the local app address.";
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== `http://${host}`) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return "Cross-origin requests are not allowed.";
  return null;
}
