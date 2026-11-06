import type { RequestHandler } from "./$types";
import { handlers } from "$lib/server/api";
export const GET: RequestHandler = ({ url }) => handlers.cv(url);
