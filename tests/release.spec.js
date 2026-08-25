const { test, expect } = require("@playwright/test");

async function cleanContext(browser, viewport) {
  return browser.newContext({ viewport: viewport || { width: 1280, height: 800 } });
}

async function closeFileOneTutorial(page) {
  await expect(page.locator("#tutorial-modal")).toHaveClass(/active/);
  await page.locator("#tutorial-close").click();
}

async function closeFileTwoTutorial(page) {
  await expect(page.locator("#tutorial-modal")).toBeVisible();
  await page.locator("#tutorial-close").click();
}

test("File 01 gives both detectives private onboarding and mutual start control", async ({ browser }) => {
  const streetContext = await cleanContext(browser, { width: 390, height: 844 });
  const deskContext = await cleanContext(browser);
  const street = await streetContext.newPage();
  const desk = await deskContext.newPage();
  const errors = [];
  street.on("pageerror", (error) => errors.push(error.message));
  desk.on("pageerror", (error) => errors.push(error.message));

  await street.goto("/");
  await expect(street.locator('meta[name="viewport"]')).toHaveAttribute("content", "width=device-width, initial-scale=1.0");
  await street.locator("#create-name").fill("Street QA");
  await street.locator("#btn-create").click();
  await expect(street.locator("#lobby-code")).toHaveText(/^[A-HJ-NP-Z2-9]{5}$/);
  const code = (await street.locator("#lobby-code").textContent()).trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
  await expect(street.locator("#btn-copy-resume")).toBeVisible();

  await desk.goto(`/?case=${code}`);
  await desk.locator("#join-name").fill("Desk QA");
  await desk.locator("#btn-join").click();
  await expect(street.locator("#tutorial-step-label")).toContainText("Step 1 of 5");
  await street.locator("#tutorial-next").click();
  await desk.locator("#tutorial-next").click();
  await expect(street.locator("#tutorial-body")).toContainText("Open Locations");
  await expect(desk.locator("#tutorial-body")).toContainText("Open People");
  await closeFileOneTutorial(street);
  await closeFileOneTutorial(desk);
  await expect(street.locator("#role-callout")).toContainText("The Street");
  await expect(desk.locator("#role-callout")).toContainText("The Desk");

  await street.getByRole("button", { name: /Detective · Recommended/ }).click();
  await desk.getByRole("button", { name: /Detective · Recommended/ }).click();
  await street.locator("#btn-begin").click();
  await expect(street.locator("#btn-begin")).toContainText("Waiting for Partner");
  await expect(street.locator("#screen-briefing")).toHaveClass(/active/);
  await expect(desk.locator("#screen-briefing")).toHaveClass(/active/);
  await desk.locator("#btn-begin").click();
  await expect(street.locator("#screen-investigation")).toHaveClass(/active/);
  await expect(desk.locator("#screen-investigation")).toHaveClass(/active/);

  await expect(street.locator("#player-guide-action")).toContainText("Ambassador Theatre");
  await street.getByRole("button", { name: /Ambassador Theatre/ }).click();
  await expect(street.locator("#scene-modal")).toHaveClass(/active/);
  await expect(street.locator("body")).toHaveClass(/modal-open/);
  await expect(street.locator("#scene-modal .modal-plain-guide")).toContainText("Do this here");
  const fieldScroll = await street.locator(".fieldwork-layout").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return { top: element.scrollTop, client: element.clientHeight, height: element.scrollHeight };
  });
  expect(fieldScroll.height).toBeGreaterThan(fieldScroll.client);
  expect(fieldScroll.top).toBeGreaterThan(0);
  await street.locator("#scene-modal-close").click();
  await expect(street.locator("body")).not.toHaveClass(/modal-open/);

  await desk.getByRole("button", { name: /Victor Amsel/ }).click();
  await expect(desk.locator("#interview-modal")).toHaveClass(/active/);
  await expect(desk.locator("#interview-modal .modal-plain-guide")).toContainText("Do this here");
  const interviewScroll = await desk.locator(".interrogation-layout").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return { top: element.scrollTop, client: element.clientHeight, height: element.scrollHeight };
  });
  expect(interviewScroll.height).toBeGreaterThan(interviewScroll.client);
  expect(interviewScroll.top).toBeGreaterThan(0);
  await desk.locator("#interview-modal-close").click();
  await expect(desk.locator("body")).not.toHaveClass(/modal-open/);

  await street.locator("#chat-input").fill("Exact time is 11:42.");
  await street.locator("#chat-form button[type=submit]").click();
  await expect(desk.locator("#chat-log")).toContainText("Exact time is 11:42.");
  await expect(street.locator("#btn-header-notes")).toBeVisible();
  expect(await street.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);

  await streetContext.close();
  await deskContext.close();
});

test("File 02 keeps its CTA visible and requires both detectives", async ({ browser }) => {
  const streetContext = await cleanContext(browser, { width: 900, height: 720 });
  const deskContext = await cleanContext(browser);
  const street = await streetContext.newPage();
  const desk = await deskContext.newPage();

  await street.goto("/case-two.html");
  const accessBox = await street.locator(".access-card").boundingBox();
  expect(accessBox.y).toBeLessThan(720);
  await expect(street.locator('meta[name="viewport"]')).toHaveAttribute("content", "width=device-width, initial-scale=1.0");
  await street.locator("#create-name").fill("Street QA");
  await street.locator("#btn-create").click();
  await expect(street.locator("#lobby-code")).toHaveText(/^[A-HJ-NP-Z2-9]{5}$/);
  const code = (await street.locator("#lobby-code").textContent()).trim();

  await desk.goto(`/case-two.html?case=${code}`);
  await desk.locator("#join-name").fill("Desk QA");
  await desk.locator("#btn-join").click();
  await expect(street.locator("#tutorial-step")).toContainText("PROTOCOL 1 OF 5");
  await closeFileTwoTutorial(street);
  await closeFileTwoTutorial(desk);
  await expect(street.locator("#briefing-role-name")).toContainText("The Street");
  await expect(desk.locator("#briefing-role-name")).toContainText("The Desk");

  await street.getByRole("button", { name: /Field · Recommended/ }).click();
  await desk.getByRole("button", { name: /Field · Recommended/ }).click();
  await street.locator("#btn-briefing-ready").click();
  await expect(street.locator("#btn-briefing-ready")).toContainText("waiting for partner");
  await expect(street.locator("#screen-briefing")).toHaveClass(/active/);
  await desk.locator("#btn-briefing-ready").click();
  await expect(street.locator("#screen-operation")).toHaveClass(/active/);
  await expect(desk.locator("#screen-operation")).toHaveClass(/active/);
  await expect(street.locator("#operation-guide-action")).toHaveText("Read your dispatch, ask for the missing fact, then choose.");
  await expect(street.locator("#dispatch-facts")).not.toHaveText(await desk.locator("#dispatch-facts").textContent());

  await street.locator("#radio-input").fill("Line VI. Read the protocol color.");
  await street.locator("#radio-form button[type=submit]").click();
  await expect(desk.locator("#radio-log")).toContainText("Line VI. Read the protocol color.");

  await streetContext.close();
  await deskContext.close();
});
