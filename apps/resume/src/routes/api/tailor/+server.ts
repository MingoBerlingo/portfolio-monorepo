import { env } from "$env/dynamic/private";
import { tailorResume, TailorProviderError } from "$lib/server/tailor";
import { validateDocument } from "../../../model";
import type { RequestHandler } from "./$types";

const failure = (status: number, error: string) => Response.json({ error }, { status });
const boundedText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;

export const POST: RequestHandler = async ({ request }) => {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return failure(400, "Use a JSON request.");
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return failure(503, "Set OPENAI_API_KEY on the resume Studio server and restart it to use Tailor Resume.");
  const reader = request.body?.getReader();
  if (!reader) return failure(400, "Missing request body.");
  const decoder = new TextDecoder();
  let raw = "";
  let bytes = 0;
  let data;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1_400_000) {
        return Response.json({ error: "The tailoring request is too large." }, {
          status: 413, headers: { Connection: "close" },
        });
      }
      raw += decoder.decode(value, { stream: true });
    }
    data = JSON.parse(raw + decoder.decode());
  } catch {
    return failure(400, "Invalid JSON request.");
  } finally {
    reader.releaseLock();
  }
  const { source, locale, cmsResume, pastedResume, job, notes, fitNotes, clarifications } = data ?? {};
  if ((source !== "cms" && source !== "paste") ||
    (locale !== "en" && locale !== "it") ||
    !boundedText(pastedResume, 30_000) || (source === "paste" && !pastedResume.trim()) ||
    !boundedText(job, 20_000) || !job.trim() ||
    !boundedText(notes, 4000) ||
    (fitNotes !== undefined && !boundedText(fitNotes, 4000)) ||
    (clarifications !== undefined && (!Array.isArray(clarifications) ||
      clarifications.length > 3 ||
      clarifications.some((item) => !boundedText(item?.question, 500) || !boundedText(item?.answer, 2000))))
  ) return failure(400, "Check the resume, job description and notes and try again.");

  let base;
  if (source === "cms") {
    try {
      base = validateDocument(cmsResume);
      if (base.locale !== locale) throw Error("Unexpected Resume locale");
    } catch {
      return failure(400, "Load a CMS resume in the selected language first.");
    }
  }
  try {
    return Response.json(await tailorResume(
      { locale, pastedResume, job, notes, fitNotes, clarifications },
      base,
      apiKey,
      env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
    ));
  } catch (cause) {
    if (cause instanceof TailorProviderError) return failure(cause.status, cause.message);
    if (cause instanceof Error && cause.name === "TimeoutError")
      return failure(504, "OpenAI took too long to respond. Try again.");
    return failure(502, "Tailor Resume could not generate a usable draft. Try again.");
  }
};
