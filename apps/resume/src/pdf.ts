import { resolve } from "node:path";
import { appRoot } from "./lib/server/paths";
import type { ResumeDocument } from "./types";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { renderResume } from "./render";
import { validateDocument } from "./model";

export async function printResume(document: ResumeDocument) {
  validateDocument(document);
  // Static TrueType faces preserve selectable text in Chromium's PDF output.
  const fontFaces = Object.fromEntries(
    await Promise.all(
      [400, 500, 600, 700].map(async (weight) => {
        const font = await readFile(
          resolve(appRoot, `static/fonts/dm-sans-${weight}.ttf`),
        );
        return [weight, `data:font/ttf;base64,${font.toString("base64")}`];
      }),
    ),
  );
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // The template has no external assets. Block all network access while printing.
    await page.route("**/*", (route) => route.abort());
    await page.emulateMedia({ media: "print" });
    await page.setContent(renderResume(document, document.locale, { fontFaces }));
    await page.evaluate(async () => {
      const faces = await Promise.all(
        [400, 500, 600, 700].map((weight) =>
          globalThis.document.fonts.load(`${weight} 16px "DM Sans"`),
        ),
      );
      await globalThis.document.fonts.ready;
      if (
        faces.some((loaded) => loaded.length === 0) ||
        !globalThis.document.fonts.check('400 16px "DM Sans"')
      )
        throw Error("The PDF font could not be loaded.");
    });
    return await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
    });
  } finally {
    await browser.close();
  }
}
