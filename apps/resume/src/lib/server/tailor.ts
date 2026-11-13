import { tailorPrompt } from "../tailor-prompt";
import { normalizeResume, validateDocument } from "../../model";
import type { ResumeDocument, Experience, Locale } from "../../types";

export class TailorProviderError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const string = { type: "string" };
const integer = { type: "integer" };
const array = (items: object) => ({ type: "array", items });
const record = (properties: Record<string, object>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const fields = (...names: string[]) =>
  record(Object.fromEntries(names.map((name) => [name, string])));
const link = fields("label", "url");
export const pastedSchema = record({
  profile: record({
    ...fields("name", "surname", "jobPosition", "presentation", "email", "phone", "location", "languages").properties,
    skills: array(string),
    linkedin: link,
    github: link,
    portfolio: link,
  }),
  experiences: array(record({
    ...fields("company", "role", "startDate", "endDate", "industries").properties,
    activities: array(string),
  })),
  education: array(fields("title", "school", "startDate", "endDate", "details")),
  publications: array(fields("title", "description", "url")),
  research: array(fields("title", "description", "url", "date", "project")),
  customSections: array(fields("title", "content")),
});
const changesSchema = record({
  presentation: string,
  skills: array(string),
  experienceChanges: array(record({ index: integer, activities: array(string) })),
});

type ModelResult = {
  questions?: string[];
  score: number;
  strengths: { requirement: string; evidence: string }[];
  scoreExplanation: string;
  changes: string[];
  sectionSuggestions: { section: string; reason: string }[];
  gaps: string[];
  draft: {
    presentation: string;
    skills: string[];
    experienceChanges: { index: number; activities: string[] }[];
  } | {
    profile: { skills: string[] };
    experiences: (Omit<Experience, "activities"> & { activities: string[] })[];
    customSections: { title: string; content: string }[];
  };
};
type TailorInput = {
  locale: Locale;
  pastedResume: string;
  job: string;
  notes: string;
  fitNotes?: string;
  clarifications?: { question: string; answer: string }[];
};

function activityText(activities: string[]): string {
  return activities.flatMap((activity) => activity.split(/\r?\n/))
    .map((activity) => activity.trim().replace(/^[-*•]\s+/, ""))
    .filter(Boolean)
    .join("\n");
}

export async function tailorResume(
  input: TailorInput,
  base: ResumeDocument | undefined,
  apiKey: string,
  model: string,
) {
  const finalizing = input.clarifications !== undefined;
  const source = base ? {
    profile: {
      jobPosition: base.profile.jobPosition,
      presentation: base.profile.presentation,
      skills: base.profile.skills,
      languages: base.profile.languages,
    },
    experiences: base.experiences,
    education: base.education,
    publications: base.publications.map(({ title, description }) => ({ title, description })),
    research: base.research.map(({ title, description }) => ({ title, description })),
  } : input.pastedResume;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 6500,
      instructions: tailorPrompt,
      input: JSON.stringify({
        phase: finalizing ? "finalize" : "assess",
        locale: input.locale,
        sourceType: base ? "cms" : "paste",
        source,
        job: input.job,
        notes: input.notes,
        fitNotes: input.fitNotes,
        clarifications: input.clarifications,
      }),
      text: { format: {
        type: "json_schema",
        name: "tailored_cv",
        strict: true,
        schema: record({
          ...(finalizing ? {} : { questions: array(string) }),
          score: integer,
          strengths: array(fields("requirement", "evidence")),
          scoreExplanation: string,
          changes: array(string),
          sectionSuggestions: array(fields("section", "reason")),
          gaps: array(string),
          draft: base ? changesSchema : pastedSchema,
        }),
      } },
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = body?.error?.code;
    if (code === "credit_balance_exhausted" || code === "insufficient_quota") {
      throw new TailorProviderError(
        429,
        "OpenAI API credits or quota are exhausted. Check your API billing or usage limits, then try again.",
      );
    }
    if (response.status === 429)
      throw new TailorProviderError(429, "OpenAI is rate-limiting requests. Wait a moment and try again.");
    if (response.status === 401)
      throw new TailorProviderError(502, "OpenAI rejected the API key. Check OPENAI_API_KEY and restart Resume Studio.");
    if (code === "model_not_found")
      throw new TailorProviderError(502, "The configured OpenAI model is unavailable to this key. Check OPENAI_MODEL.");
    throw new TailorProviderError(502, "OpenAI rejected the tailoring request. Try again in a moment.");
  }
  const body = await response.json();
  const content = body.output?.find((item: { type: string }) => item.type === "message")
    ?.content?.find((item: { type: string }) => item.type === "output_text");
  if (body.status !== "completed" || typeof content?.text !== "string")
    throw Error("OpenAI did not return a complete draft");
  const result: ModelResult = JSON.parse(content.text);
  if (!Number.isInteger(result.score) || result.score < 0 || result.score > 100)
    throw Error("Invalid fit estimate");
  const assessment = {
    score: result.score,
    strengths: result.strengths,
    scoreExplanation: result.scoreExplanation,
    gaps: result.gaps,
    sectionSuggestions: result.sectionSuggestions.slice(0, 3),
  };
  if (!finalizing && result.questions?.length) {
    const questions = result.questions.map((question) => question.trim()).filter(Boolean);
    if (!questions.length || questions.length > 3 || questions.some((question) => question.length > 500))
      throw Error("Invalid clarification questions");
    return { questions, ...assessment };
  }
  let document: ResumeDocument;
  if (base) {
    if (!("experienceChanges" in result.draft)) throw Error("Invalid CMS draft");
    document = structuredClone(base);
    if (result.draft.presentation.trim()) document.profile.presentation = result.draft.presentation;
    const skills = activityText(result.draft.skills);
    if (skills) document.profile.skills = skills;
    const seen = new Set<number>();
    for (const { index, activities } of result.draft.experienceChanges) {
      if (!Number.isInteger(index) || !document.experiences[index] || seen.has(index))
        throw Error("Invalid experience change");
      seen.add(index);
      const bullets = activityText(activities);
      if (bullets) document.experiences[index].activities = bullets;
    }
  } else {
    if (!("experiences" in result.draft)) throw Error("Invalid pasted resume draft");
    document = normalizeResume({
      ...result.draft,
      profile: { ...result.draft.profile, skills: activityText(result.draft.profile.skills) },
      experiences: result.draft.experiences.map((entry) => ({
        ...entry,
        activities: activityText(entry.activities),
      })),
    }, input.locale);
    document.customSections = result.draft.customSections.map(({ title, content }, index) => ({
      id: `custom-paste-${index}`,
      title,
      content,
    }));
    document.sectionOrder.push(...document.customSections.map(({ id }) => id));
  }
  return {
    document: validateDocument(document),
    ...assessment,
    changes: result.changes.slice(0, 4),
  };
}
