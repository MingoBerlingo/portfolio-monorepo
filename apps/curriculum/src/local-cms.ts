import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { appRoot } from "./lib/server/paths";
import type { Locale } from "./types";
import { readCV, validateLocale } from "./cms";

const run = promisify(execFile);
const marker = "\n__PORTFOLIO_CV_JSON__=";

/** Private fields are read on this machine, not exposed anonymously by Payload. */
export async function readAppCV({ locale }: { locale: Locale }) {
  validateLocale(locale);
  const base = new URL(process.env.CMS_API_URL || "http://localhost:3000");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) {
    if (!process.env.CMS_TOKEN)
      throw Error(
        "A remote CMS needs CMS_TOKEN configured on the local app server.",
      );
    return readCV({ baseURL: base.href, locale, token: process.env.CMS_TOKEN });
  }
  try {
    const cmsPackage = resolve(appRoot, "../cms/package.json");
    const cmsRequire = createRequire(cmsPackage);
    const payloadRequire = createRequire(cmsRequire.resolve("payload"));
    const loader = pathToFileURL(payloadRequire.resolve("tsx")).href;
    const script = resolve(appRoot, "../cms/scripts/read-curriculum.ts");
    const { stdout } = await run(
      process.execPath,
      ["--import", loader, script, locale],
      {
        cwd: resolve(appRoot, "../cms"),
        timeout: 30000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    const index = stdout.lastIndexOf(marker);
    if (index < 0) throw Error("No curriculum data returned");
    return JSON.parse(stdout.slice(index + marker.length).split("\n")[0]);
  } catch {
    // Never send child-process logs, connection strings or credentials to a browser.
    throw Error(
      "The local CMS database could not be read. Check that MongoDB is running and apps/cms/.env is configured.",
    );
  }
}
