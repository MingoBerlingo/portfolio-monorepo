import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// Works both from source (tsx/Vite) and adapter-node's bundled server chunks.
export function findAppRoot(
  start = dirname(fileURLToPath(import.meta.url)),
): string {
  let path = start;
  while (true) {
    const manifest = resolve(path, "package.json");
    if (
      existsSync(manifest) &&
      (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name ===
        "curriculum"
    )
      return path;
    const parent = dirname(path);
    if (parent === path)
      throw new Error("Curriculum application directory was not found.");
    path = parent;
  }
}
export const appRoot = findAppRoot();
