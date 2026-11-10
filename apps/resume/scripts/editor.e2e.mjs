import { verifyControlsAndShortcuts } from "./shortcuts.e2e.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { request as httpRequest } from "node:http";
import { fileURLToPath } from "node:url";
const HISTORY_KEY = "portfolio.curriculum.versions.v1";

const output = new URL("../output/", import.meta.url);
await mkdir(output, { recursive: true });
// Use the real adapter-node build, including SvelteKit routing and hydration.
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const url = `http://127.0.0.1:${port}`;
let serverOutput = "";
const server = spawn(process.execPath, ["scripts/start.mjs"], {
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    ORIGIN: url,
    RESUME_FIXTURES: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => (serverOutput += chunk));
server.stderr.on("data", (chunk) => (serverOutput += chunk));
try {
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null)
      throw Error(`Built app exited: ${serverOutput}`);
    try {
      const response = await fetch(url);
      if (response.ok) break;
    } catch {}
    if (attempt >= 100)
      throw Error(
        `Built app did not start. Run pnpm --filter resume build first. ${serverOutput}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
} catch (error) {
  server.kill();
  throw error;
}
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(8000);
page.setDefaultNavigationTimeout(10000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const frame = page.locator("#canvas");
const field = (path, line) =>
  frame.locator(
    `[data-field="${path}"]${line === undefined ? "" : `[data-line="${line}"]`}`,
  );
const save = async (name) => {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByLabel("Version name").fill(name);
  await page
    .locator("#save-form")
    .getByRole("button", { name: "Save", exact: true })
    .click();
};
try {
  assert.equal(
    (
      await fetch(url + "/fonts/dm-sans.woff2", {
        headers: { Origin: "https://foreign.test" },
      })
    ).status,
    403,
  );
  const foreignHostStatus = await new Promise((resolve, reject) => {
    const req = httpRequest(
      url + "/fonts/dm-sans.woff2",
      { headers: { Host: "foreign.test:" + port } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(foreignHostStatus, 403);
  assert.equal((await fetch(url + "/api/resume?locale=fr")).status, 400);
  assert.equal(
    (
      await fetch(url + "/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: " ".repeat(1024 * 1024 + 1),
      })
    ).status,
    413,
  );
  await page.route("**/fonts/dm-sans.woff2", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.continue();
  });
  await page.goto(url);
  await field("profile.name").waitFor();
  assert.equal(await field("profile.name").textContent(), "Ada");
  await verifyControlsAndShortcuts(page);
  assert.equal(
    await page.locator('#sections [data-section="additional"]').count(),
    0,
  );
  assert.equal(await page.locator('[data-section-drag="profile"]').count(), 0);
  assert.equal(await page.locator("[data-order]").count(), 0);
  const sectionKeys = () =>
    page
      .locator("#sections [data-section]")
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.section));
  const originalOrder = await sectionKeys();
  await page.locator('#sections [data-section="experience"]').click();
  await page.waitForFunction(() => {
    const y = document
      .querySelector('#canvas [data-section="experience"]')
      .getBoundingClientRect().top;
    return y >= 80 && y <= 160;
  });
  await page.locator('#sections [data-section="profile"]').click();
  await page.waitForFunction(() => {
    const rect = document
      .querySelector("#canvas header")
      .getBoundingClientRect();
    return rect.top >= 64 && rect.bottom <= innerHeight;
  });
  const keyboardMove = async (locator, direction) => {
    await locator.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press(direction);
    await page.keyboard.press("Space");
    await page.waitForFunction(() => {
      const handles = [
        ...document.querySelectorAll("[data-section-drag],[data-entry-drag]"),
      ];
      return (
        !handles.some((node) => node.getAttribute("aria-grabbed") === "true") &&
        new Set(
          handles.map(
            (node) =>
              node.getAttribute("data-section-drag") ||
              node.getAttribute("data-entry-drag"),
          ),
        ).size === handles.length
      );
    });
  };
  await keyboardMove(
    frame.locator('[data-section-drag="experience"]'),
    "ArrowUp",
  );
  assert.ok(
    (await sectionKeys()).indexOf("experience") <
      originalOrder.indexOf("experience"),
  );
  await keyboardMove(
    frame.locator('[data-section-drag="experience"]'),
    "ArrowDown",
  );
  assert.deepEqual(await sectionKeys(), originalOrder);
  // Cancel restores the pre-drag snapshot rather than leaving the live sort behind.
  await frame.locator('[data-section-drag="skills"]').focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => !document.querySelector("[data-dnd-placeholder]"),
  );
  await page.waitForFunction(
    (expected) =>
      [...document.querySelectorAll("#sections [data-section]")]
        .map((n) => n.dataset.section)
        .join(",") === expected,
    originalOrder.join(","),
  );
  // Pointer dragging uses only the handle; text remains selectable/editable.
  const drag = async () => {
    const source = await frame
        .locator('[data-section-drag="skills"]')
        .boundingBox(),
      target = await frame
        .locator('[data-section-drag="introduction"]')
        .boundingBox();
    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      target.x + target.width / 2,
      target.y + target.height / 2,
      { steps: 14 },
    );
    await page.mouse.up();
    await page.waitForFunction(
      () => !document.querySelector("[data-dnd-placeholder]"),
    );
  };
  await frame.locator('[data-section="skills"]').scrollIntoViewIfNeeded();
  await drag();
  await page.waitForFunction(() => {
    const keys = [...document.querySelectorAll("#sections [data-section]")].map(
      (n) => n.dataset.section,
    );
    return keys.indexOf("skills") < keys.indexOf("introduction");
  });
  await keyboardMove(
    frame.locator('[data-section-drag="skills"]'),
    "ArrowDown",
  );
  assert.deepEqual(await sectionKeys(), originalOrder);
  const cdp = await context.newCDPSession(page);
  const touchSource = await frame
      .locator('[data-section-drag="skills"]')
      .boundingBox(),
    touchTarget = await frame
      .locator('[data-section-drag="introduction"]')
      .boundingBox();
  const point = (rect) => ({
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(touchSource)],
  });
  await page.waitForFunction(() =>
    document.querySelector('[data-section-drag="skills"][aria-grabbed="true"]'),
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [point(touchTarget)],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForFunction(
    () => !document.querySelector("[data-dnd-placeholder]"),
  );
  assert.ok(
    (await sectionKeys()).indexOf("skills") <
      (await sectionKeys()).indexOf("introduction"),
  );
  await keyboardMove(
    frame.locator('[data-section-drag="skills"]'),
    "ArrowDown",
  );
  assert.deepEqual(await sectionKeys(), originalOrder);
  await cdp.detach();
  assert.equal(await frame.locator("[data-section-delete]").count(), 0);
  await frame.locator('[data-section="skills"]').hover();
  await frame
    .locator('[data-section="skills"] [data-toggle-visibility]')
    .click();
  assert.ok(
    await frame
      .locator('[data-section="skills"]')
      .evaluate((n) => n.classList.contains("section-hidden")),
  );
  await frame
    .locator('[data-section="skills"] [data-toggle-visibility]')
    .click();
  assert.equal(await page.locator("#section-visible").count(), 0);
  assert.equal(
    await page.locator("#locale option:checked").textContent(),
    "🇬🇧 EN",
  );
  assert.equal(
    await page
      .locator(
        ".page-heading,.app-footer,.local-note,.editor-pane,.preview-pane",
      )
      .count(),
    0,
  );
  assert.match(
    await page
      .locator("body")
      .evaluate((node) => getComputedStyle(node).fontFamily),
    /DM Sans/,
  );
  await page.evaluate(() => document.fonts.ready);
  assert.match(
    await frame
      .locator(".resume-paper")
      .evaluate((node) => getComputedStyle(node).fontFamily),
    /DM Sans/,
  );
  await field("profile.jobPosition").fill("Tailored Product Designer");
  await field("profile.phone").fill("+39 123 4567");
  await field("profile.presentation").fill(
    "Local introduction for a specific job opportunity.\nSecond paragraph.",
  );
  await field("profile.skills").fill("Product strategy\nAccessibility\nSvelte");
  await field("experiences.0.role").fill("Lead experience designer");
  await field("experiences.0.activities", 0).fill(
    "Tailored achievement unique to this saved version.",
  );
  await field("experiences.0.activities", 0).press("End");
  await field("experiences.0.activities", 0).press("Enter");
  await field("experiences.0.activities", 1).fill(
    "Extra result entered directly on the resume.",
  );
  await field("experiences.0.activities", 1).evaluate((node) => {
    const range = node.ownerDocument.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    const selection =
      node.getRootNode().getSelection?.() || node.ownerDocument.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await field("experiences.0.activities", 1).press("Backspace");
  await field("experiences.0.activities", 0).waitFor();
  assert.match(
    await field("experiences.0.activities", 0).textContent(),
    /Extra result entered directly/,
  );
  await field("experiences.0.activities", 0).fill(
    "Tailored achievement unique to this saved version.",
  );
  await frame.locator('[data-entry="experiences.0"] .date').hover();
  await frame
    .locator('[data-details="dates"][data-path="experiences.0"]')
    .click();
  await page.getByLabel("Start date", { exact: true }).fill("2021-03-01");
  await page.getByLabel("End date", { exact: true }).fill("");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await field("profile.linkedin.label").hover();
  await frame
    .locator('[data-details="link"][data-path="profile.linkedin"]')
    .click();
  await page
    .locator("#details-dialog")
    .getByLabel("URL", { exact: true })
    .fill("https://example.test/tailored");
  await page
    .getByLabel("Link text", { exact: true })
    .fill("Professional profile");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  console.log("Inline text, bullets, date and link controls passed.");
  const originalCompany = await field("experiences.0.company").textContent();
  await keyboardMove(
    frame.locator('[data-entry-drag="experiences.0"]'),
    "ArrowDown",
  );
  assert.equal(
    await field("experiences.1.company").textContent(),
    originalCompany,
  );
  await page.locator('#sections [data-section="experience"]').click();
  await page.locator('#section-controls [data-action="add"]').click();
  await field("experiences.5.company").fill("Temporary entry");
  await frame.locator('[data-entry="experiences.5"]').hover();
  page.once("dialog", (dialog) => dialog.accept());
  await frame.locator('[data-entry-delete="experiences.5"]').click();
  await field("publications.0.title").fill("Tailored publication");
  await field("research.0.description").fill(
    "Research adapted to this position.",
  );
  await page.locator('#sections [data-section="research"]').click();
  await keyboardMove(
    frame.locator('[data-section-drag="research"]'),
    "ArrowUp",
  );
  await frame
    .locator('[data-section="research"] [data-toggle-visibility]')
    .click();
  await page
    .getByRole("button", { name: "Profile & contact", exact: false })
    .click();
  // Paste is plain text even when the clipboard supplies HTML.
  await field("profile.jobPosition").fill("");
  await field("profile.jobPosition").focus();
  await field("profile.jobPosition").evaluate((node) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "<b>literal title</b>");
    clipboardData.setData("text/html", "<img src=x onerror=alert(1)>");
    node.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  assert.equal(
    await field("profile.jobPosition").textContent(),
    "<b>literal title</b>",
  );
  assert.equal(await frame.locator("img,script").count(), 0);
  await field("profile.jobPosition").evaluate((node) => {
    node.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true, data: "" }),
    );
    node.textContent = "設計者";
    node.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertCompositionText",
        data: "設計者",
        isComposing: true,
      }),
    );
    node.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "設計者" }),
    );
    node.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: "設計者",
      }),
    );
  });
  assert.equal(await field("profile.jobPosition").textContent(), "設計者");
  await field("profile.jobPosition").fill("Tailored Product Designer");
  assert.equal(
    await page.locator("#version-status").textContent(),
    "Unsaved changes",
  );
  await page.screenshot({
    path: new URL("editor-desktop.png", output).pathname,
    fullPage: true,
  });
  console.log("Inline structural and paste checks passed.");
  await save("Acme · Product designer");
  let saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    HISTORY_KEY,
  );
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, "Acme · Product designer");
  assert.ok(Number.isFinite(Date.parse(saved[0].savedAt)));
  assert.equal(
    saved[0].document.profile.jobPosition,
    "Tailored Product Designer",
  );
  assert.equal(saved[0].document.profile.phone, "+39 123 4567");
  assert.equal(saved[0].document.publications[0].title, "Tailored publication");
  assert.equal(
    saved[0].document.research[0].description,
    "Research adapted to this position.",
  );
  assert.ok(saved[0].document.hiddenSections.includes("research"));
  assert.equal(saved[0].document.experiences[1].startDate, "2021-03-01");
  assert.equal(
    saved[0].document.profile.linkedin.url,
    "https://example.test/tailored",
  );
  assert.match(saved[0].document.profile.presentation, /\nSecond paragraph/);
  await field("profile.jobPosition").fill("Unsaved replacement");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("#locale").selectOption("it");
  assert.equal(await page.locator("#locale").inputValue(), "en");
  assert.equal(
    await field("profile.jobPosition").textContent(),
    "Unsaved replacement",
  );
  let blocked = false;
  page.once("dialog", async (dialog) => {
    assert.equal(dialog.type(), "beforeunload");
    blocked = true;
    await dialog.dismiss();
  });
  await page.reload({ timeout: 5000 }).catch((error) => {
    if (!/ERR_ABORTED|Timeout/.test(error.message)) throw error;
  });
  assert.equal(blocked, true);
  await page.getByRole("button", { name: /History/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator("#history-list")
    .getByRole("button", { name: "Load", exact: true })
    .click();
  assert.equal(
    await field("profile.jobPosition").textContent(),
    "Tailored Product Designer",
  );
  await page.evaluate((key) => {
    const versions = JSON.parse(localStorage.getItem(key));
    delete versions[0].document.profile.portfolio;
    localStorage.setItem(key, JSON.stringify(versions));
  }, HISTORY_KEY);
  await page.reload();
  await field("profile.name").waitFor();
  await page.getByRole("button", { name: /History/ }).click();
  await page
    .locator("#history-list")
    .getByRole("button", { name: "Load", exact: true })
    .click();
  assert.equal(
    await page.locator("#version-status").textContent(),
    "Acme · Product designer",
  );
  assert.equal(
    await page.evaluate(
      (key) =>
        Object.hasOwn(
          JSON.parse(localStorage.getItem(key))[0].document.profile,
          "portfolio",
        ),
      HISTORY_KEY,
    ),
    false,
  );
  await field("profile.portfolio.label").fill("Legacy portfolio");
  assert.equal(
    await field("profile.portfolio.label").textContent(),
    "Legacy portfolio",
  );
  assert.equal(
    await page.locator("#version-status").textContent(),
    "Unsaved changes",
  );
  assert.equal(
    await field("profile.jobPosition").textContent(),
    "Tailored Product Designer",
  );
  await field("profile.jobPosition").fill("Latest unsaved PDF title");
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByLabel("Version name").fill("Cannot save");
  await page
    .locator("#save-form")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.getByText(/Could not save/).waitFor();
  assert.equal(
    await page.locator("#version-status").textContent(),
    "Unsaved changes",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
    delete window.originalSetItem;
  });
  console.log("History and unsaved-change guards passed.");
  const pdfRequestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/pdf") && request.method() === "POST",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.keyboard.press("Meta+Shift+e");
  const pdfDialog = page.getByRole("dialog", { name: "Download PDF" });
  const filename = pdfDialog.getByLabel("File name");
  assert.equal(await filename.inputValue(), "Acme · Product designer");
  await filename.fill("Acme application.pdf");
  await pdfDialog.getByRole("button", { name: "Download", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(new URL("editor-edited.pdf", output).pathname);
  const pdfDocument = (await pdfRequestPromise).postDataJSON();
  assert.equal(pdfDocument.profile.jobPosition, "Latest unsaved PDF title");
  assert.ok(pdfDocument.hiddenSections.includes("research"));
  assert.equal(
    (await readFile(new URL("editor-edited.pdf", output)))
      .subarray(0, 5)
      .toString(),
    "%PDF-",
  );
  assert.equal(download.suggestedFilename(), "Acme application.pdf");
  assert.equal(
    await page.locator("#version-status").textContent(),
    "Unsaved changes",
  );
  await save("Final English");
  await page.locator("#locale").selectOption("it");
  await page.waitForFunction(() =>
    document
      .querySelector("#canvas")
      .querySelector('[data-field="profile.jobPosition"]')
      ?.textContent.includes("sviluppatrice"),
  );
  assert.equal(
    await page.locator("#locale option:checked").textContent(),
    "🇮🇹 IT",
  );
  await page.locator('#sections [data-section="research"]').click();
  let releaseImport;
  const importGate = new Promise((resolve) => (releaseImport = resolve));
  await page.route(
    "**/api/resume?*",
    async (route) => {
      await importGate;
      await route.continue();
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Load from CMS", exact: false })
    .click();
  await page.waitForFunction(() => document.querySelector("#reload").disabled);
  assert.equal(
    await frame
      .locator('[data-section="research"] [data-toggle-visibility]')
      .isEnabled(),
    false,
  );
  assert.equal(
    await field("profile.name").getAttribute("contenteditable"),
    "false",
  );
  releaseImport();
  await page.waitForFunction(() => !document.querySelector("#reload").disabled);
  await field("profile.name").waitFor();
  await page.setViewportSize({ width: 1021, height: 904 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(await page.locator("#canvas-pane").isVisible(), true);
  await page.screenshot({
    path: new URL("editor-tablet.png", output).pathname,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator('#sections [data-section="profile"]').click();
  await field("profile.jobPosition").fill("Titolo modificato sul layout");
  await page.screenshot({
    path: new URL("editor-mobile-preview.png", output).pathname,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Inline editor E2E passed: direct text/multiline/bullet editing, paste safety, dates/links, add/remove/reorder/hide, DM Sans, named history, unsaved guards, quota failure, PDF parity, loading lock and responsive canvas.",
  );
} catch (error) {
  console.error(
    "Browser state at failure:",
    await page
      .evaluate(() => ({
        status: document.querySelector("#version-status")?.textContent,
        notice: document.querySelector("#notice")?.textContent,
        canvasState: document
          .querySelector("#canvas")
          ?.querySelector("[data-field]")
          ? "ready"
          : "missing",
        loading: document.querySelector("#canvas-pane")?.className,
      }))
      .catch(() => ({})),
  );
  throw error;
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null || server.signalCode !== null) resolve();
    else server.once("exit", resolve);
  });
}
