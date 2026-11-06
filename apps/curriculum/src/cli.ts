import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { validateLocale } from "./cms.ts";
import { readAppCV } from "./local-cms.ts";
import { normalizeCV } from "./model.ts";
import { renderCV } from "./render.ts";
import { printCV } from "./pdf";

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
      "Usage: pnpm curriculum:pdf --locale it|en [--fixture path.json]\nWeb editor: pnpm curriculum:dev",
    );
  } else {
    if (positionals.length !== 1 || positionals[0] !== "pdf")
      throw Error(
        "Use pnpm curriculum:dev for the web editor or pnpm curriculum:pdf for command-line export.",
      );
    validateLocale(values.locale);
    const source = values.fixture
      ? JSON.parse(await readFile(resolve(values.fixture), "utf8"))
      : await readAppCV({ locale: values.locale });
    const document = normalizeCV(source, values.locale);
    const pdf = await printCV(document);
    const output = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../output",
    );
    await mkdir(output, { recursive: true, mode: 0o700 });
    const path = resolve(output, `cv-${document.locale}.pdf`);
    await writeFile(path, pdf, { mode: 0o600 });
    await writeFile(
      resolve(output, `cv-${document.locale}.html`),
      renderCV(document),
      { mode: 0o600 },
    );
    console.log(`Generated ${path}`);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Curriculum export failed.",
  );
  process.exitCode = 1;
}
