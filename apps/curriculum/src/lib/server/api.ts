import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeCV, validateDocument, MAX_DOCUMENT_BYTES } from "../../model";
import { readAppCV } from "../../local-cms";
import { printCV } from "../../pdf";
import type { CVDocument, Locale } from "../../types";
import { appRoot } from "./paths";
interface Dependencies {
  read?: (options: { locale: Locale }) => Promise<unknown>;
  print?: (document: CVDocument) => Promise<Uint8Array>;
}
const failure = (status: number, error: string) =>
  Response.json(
    { error },
    { status, ...(status === 413 ? { headers: { Connection: "close" } } : {}) },
  );
export function createHandlers({
  read = readAppCV,
  print = printCV,
}: Dependencies = {}) {
  let printing = false;
  return {
    async cv(url: URL): Promise<Response> {
      const locale = url.searchParams.get("locale");
      if (locale !== "en" && locale !== "it")
        return failure(400, "Unsupported locale. Use en or it.");
      try {
        const data: unknown =
          process.env.CURRICULUM_FIXTURES === "1"
            ? JSON.parse(
                await readFile(
                  resolve(appRoot, `test/fixtures/${locale}.json`),
                  "utf8",
                ),
              )
            : await read({ locale });
        return Response.json(normalizeCV(data, locale));
      } catch {
        return failure(
          503,
          "The CMS is unavailable. Check its configuration and try again.",
        );
      }
    },
    async pdf(request: Request): Promise<Response> {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return failure(400, "Use a JSON request.");
      const reader = request.body?.getReader();
      if (!reader) return failure(400, "Invalid JSON request.");
      const parts: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          length += part.value.byteLength;
          if (length > MAX_DOCUMENT_BYTES) {
            // Canceling adapter-node’s request stream destroys the socket before
            // the JSON error can reach the client. Stop reading and close after response.
            reader.releaseLock();
            return failure(413, "The CV exceeds the 1 MB limit.");
          }
          parts.push(part.value);
        }
      } catch {
        return failure(400, "Invalid JSON request.");
      }
      let document: CVDocument;
      try {
        document = validateDocument(
          JSON.parse(Buffer.concat(parts).toString("utf8")),
        );
      } catch {
        return failure(
          400,
          "Invalid CV document. Check the document and try again.",
        );
      }
      if (printing)
        return failure(
          429,
          "Another PDF is being prepared. Try again in a moment.",
        );
      printing = true;
      try {
        const bytes = await print(document);
        return new Response(new Uint8Array(bytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="cv-${document.locale}.pdf"`,
          },
        });
      } catch {
        return failure(
          500,
          "The PDF could not be prepared. Try again in a moment.",
        );
      } finally {
        printing = false;
      }
    },
  };
}
export const handlers = createHandlers();
