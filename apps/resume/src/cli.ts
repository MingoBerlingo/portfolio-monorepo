import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { validateLocale } from "./cms.ts";
import { readAppResume } from "./local-cms.ts";
import { normalizeResume } from "./model.ts";
import { renderResume } from "./render.ts";
import { printResume } from "./pdf";

try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      locale: { type: "string", default: "it" },
      fixture: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "Usage: pnpm resume:pdf --locale it|en [--fixture path.json]\nWeb editor: pnpm resume:dev",
    );
  } else {
    if (positionals.length !== 1 || positionals[0] !== "pdf")
      throw Error(
        "Use pnpm resume:dev for the web editor or pnpm resume:pdf for command-line export.",
      );
    validateLocale(values.locale);
    const source = values.fixture
      ? JSON.parse(await readFile(resolve(values.fixture), "utf8"))
      : await readAppResume({ locale: values.locale });
    const document = normalizeResume(source, values.locale);
    const pdf = await printResume(document);
    const output = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../output",
    );
    await mkdir(output, { recursive: true, mode: 0o700 });
    const path = resolve(output, `resume-${document.locale}.pdf`);
    await writeFile(path, pdf, { mode: 0o600 });
    await writeFile(
      resolve(output, `resume-${document.locale}.html`),
      renderResume(document),
      { mode: 0o600 },
    );
    console.log(`Generated ${path}`);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Resume export failed.",
  );
  process.exitCode = 1;
}
