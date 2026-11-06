import { createServer } from "node:http";
// The route enforces its own streamed 1 MB limit with a safe JSON error.
process.env.BODY_SIZE_LIMIT = "Infinity";
const { handler } = await import("../build/handler.js");
const port = Number(process.env.PORT || 4174);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error("PORT must be between 1024 and 65535.");
createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  // Adapter-node serves static files before SvelteKit hooks, so cover those too.
  const host = request.headers.host ?? "";
  const local = /^(localhost|127\.0\.0\.1):\d+$/.test(host);
  const sameOrigin =
    !request.headers.origin || request.headers.origin === `http://${host}`;
  if (
    !local ||
    !sameOrigin ||
    request.headers["sec-fetch-site"] === "cross-site"
  ) {
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        error: local
          ? "Cross-origin requests are not allowed."
          : "Use the local app address.",
      }),
    );
    return;
  }
  handler(request, response);
}).listen(port, "127.0.0.1", () =>
  console.log(`Curriculum Studio: http://127.0.0.1:${port}`),
);
