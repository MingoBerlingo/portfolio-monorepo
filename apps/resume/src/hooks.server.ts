import type { Handle } from "@sveltejs/kit";
import { requestViolation } from "$lib/server/security";
export const handle: Handle = async ({ event, resolve }) => {
  const violation = requestViolation(event.request);
  const response = violation
    ? Response.json({ error: violation }, { status: 403 })
    : await resolve(event);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
};
