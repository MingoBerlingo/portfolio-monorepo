import type { Locale } from "./types.ts";

export function formatResumeDate(value: string, locale: Locale): string {
  if (!value) return locale === "it" ? "In corso" : "Present";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid Resume date: ${value}`);
  const label = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return locale === "it"
    ? label.charAt(0).toLocaleUpperCase("it-IT") + label.slice(1)
    : label;
}

export function formatResumeRange(
  start: string,
  end: string,
  locale: Locale,
  ongoing = false,
): string {
  const first = start ? formatResumeDate(start, locale) : "";
  const last = end
    ? formatResumeDate(end, locale)
    : ongoing
      ? formatResumeDate("", locale)
      : "";
  // The Resume displays month precision, even if the stored dates contain different days.
  if (start && end) {
    const a = new Date(start),
      b = new Date(end);
    if (
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth()
    )
      return first;
  }
  return [first, last].filter(Boolean).join(" – ");
}
