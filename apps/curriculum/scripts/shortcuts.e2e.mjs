import assert from "node:assert/strict";
export async function verifyControlsAndShortcuts(page) {
  const canvas = page.locator("#canvas");
  const field = (path) => canvas.locator(`[data-field="${path}"]`);
  const value = async (expected) =>
    page.waitForFunction(
      (expected) =>
        document.querySelector('[data-field="profile.jobPosition"]')
          ?.textContent === expected,
      expected,
    );
  assert.equal(await page.title(), "CV Studio");
  assert.equal(await page.locator("#section-visible").count(), 0);
  assert.equal(await canvas.locator("[data-section-delete]").count(), 0);
  const entryCount = await canvas
    .locator('[data-entry^="experiences."]')
    .count();
  const unexpected = [];
  const dismiss = (dialog) => {
    unexpected.push(dialog.message());
    void dialog.dismiss();
  };
  page.on("dialog", dismiss);
  await canvas.locator('[data-section-drag="experience"]').focus();
  await page.keyboard.press("Delete");
  await page.keyboard.press("Backspace");
  page.off("dialog", dismiss);
  assert.deepEqual(unexpected, []);
  assert.equal(
    await canvas.locator('[data-entry^="experiences."]').count(),
    entryCount,
  );
  const original = await field("profile.jobPosition").textContent();
  await field("profile.jobPosition").fill("Grouped first edit");
  await field("profile.jobPosition").fill("Grouped second edit");
  await page.keyboard.press("Meta+z");
  await value(original);
  await page.keyboard.press("Meta+Shift+z");
  await value("Grouped second edit");
  await page.keyboard.press("Meta+z");
  await value(original);
  await page.keyboard.press("Control+y");
  await value("Grouped second edit");
  await page.keyboard.press("Meta+z");
  await value(original);
  const contacts = () =>
    canvas
      .locator('[data-block^="contact:"]')
      .evaluateAll((ns) => ns.map((n) => n.dataset.block));
  const contactOrder = await contacts();
  await canvas.locator('[data-block="contact:phone"] [data-move="up"]').focus();
  await page.keyboard.press("Alt+ArrowUp");
  assert.equal((await contacts())[0], "contact:phone");
  await page.keyboard.press("Meta+z");
  assert.deepEqual(await contacts(), contactOrder);
  await canvas.locator('[data-block="contact:phone"] .drag-handle').focus();
  await page.keyboard.press("Delete");
  assert.equal(await canvas.locator('[data-block="contact:phone"]').count(), 0);
  await page.keyboard.press("Meta+z");
  assert.equal(await canvas.locator('[data-block="contact:phone"]').count(), 1);
  await canvas.locator('[data-section-drag="skills"]').focus();
  await page.keyboard.press("h");
  assert.ok(
    await canvas
      .locator('[data-section="skills"]')
      .evaluate((n) => n.classList.contains("section-hidden")),
  );
  await page.keyboard.press("Meta+z");
  assert.equal(
    await canvas
      .locator('[data-section="skills"]')
      .evaluate((n) => n.classList.contains("section-hidden")),
    false,
  );
  const sections = () =>
    page
      .locator("#sections [data-section]")
      .evaluateAll((ns) => ns.map((n) => n.dataset.section));
  const sectionOrder = await sections();
  await canvas
    .locator('[data-section="skills"] > .block-tools [data-move="up"]')
    .focus();
  await page.keyboard.press("Alt+ArrowUp");
  assert.ok(
    (await sections()).indexOf("skills") <
      (await sections()).indexOf("introduction"),
  );
  await page.keyboard.press("Meta+z");
  assert.deepEqual(await sections(), sectionOrder);
  const skills = await field("profile.skills").textContent();
  await field("profile.skills").fill("h");
  await page.keyboard.press("Backspace");
  assert.equal(
    await canvas
      .locator('[data-section="skills"]')
      .evaluate((n) => n.classList.contains("section-hidden")),
    false,
  );
  await page.keyboard.press("Meta+z");
  await page.waitForFunction(
    (text) =>
      document.querySelector('[data-field="profile.skills"]').textContent ===
      text,
    skills,
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("?");
  await page.locator("#shortcuts-dialog[open]").waitFor();
  assert.match(await page.locator("#shortcuts-dialog").innerText(), /Undo/);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Meta+s");
  await page.locator("#save-dialog[open]").waitFor();
  await page.locator("#version-name").fill("Unsubmitted name");
  await page.keyboard.press("Meta+Shift+s");
  assert.equal(await page.locator("#version-name").inputValue(), "");
  await page.keyboard.press("Escape");
  // Selection is outside text editing, and every toolbar remains left of its block.
  for (const block of [
    "contact:phone",
    "section:skills",
    "entry:experiences.0",
  ]) {
    const node = canvas.locator(`[data-block="${block}"]`);
    const b = await node.boundingBox(),
      tools = await node.locator(":scope > .block-tools").boundingBox();
    assert.ok(
      tools.x + tools.width <= b.x + 1,
      `${block} controls must be left-aligned`,
    );
  }
  for (const edit of await canvas.locator('[data-details="link"]').all()) {
    assert.equal(await edit.getAttribute("aria-label"), "Edit link");
    assert.equal(await edit.locator("svg").count(), 1);
    assert.equal(await edit.textContent(), "");
  }
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#version-status").textContent(), "CMS copy");
  console.log("CV Studio controls and Mac/Windows shortcuts passed.");
}
