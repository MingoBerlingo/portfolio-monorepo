import type { RequestHandler } from "./$types";
import { handlers } from "$lib/server/api";
export const POST: RequestHandler = ({ request }) => handlers.pdf(request);
