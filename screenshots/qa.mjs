import { chromium } from "file:///C:/Users/kerpu/.vscode/schematiq/node_modules/.pnpm/playwright@1.59.1/node_modules/playwright/index.mjs";
import fs from "fs";

const OUT_DIR = "C:\\Users\\kerpu\\.vscode\\rosewoodhackethon\\screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const logLines = [];
const log = (...args) => {
  const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  console.log(line);
  logLines.push(line);
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:\\Users\\kerpu\\AppData\\Local\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe",
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") log("PAGE-ERR:", msg.text());
  });
  page.on("pageerror", (err) => log("PAGEERROR:", err.message));

  const shot = async (name) => {
    const p = `${OUT_DIR}\\${name}`;
    await page.screenshot({ path: p, fullPage: false });
    log("SAVED", name);
  };

  // ---- 1-4: Home -> default = service ----
  log("STEP 1: goto /");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2500);
  await shot("qa-01-default.png");

  const clickTab = async (label) => {
    try {
      const tab = page.locator(`nav button, button, [role="tab"]`).filter({ hasText: new RegExp(`^${label}$`, "i") }).first();
      await tab.click({ timeout: 5000 });
    } catch (e) {
      log(`Failed to click tab ${label}:`, e.message);
      // fallback
      try {
        await page.getByText(label, { exact: true }).first().click({ timeout: 4000 });
      } catch (e2) {
        log(`Fallback also failed for ${label}:`, e2.message);
      }
    }
    await sleep(600);
  };

  log("STEP 5: Reservations");
  await clickTab("Reservations");
  await shot("qa-02-reservations.png");

  log("STEP 6: Guest Profiles");
  await clickTab("Guest Profiles");
  await shot("qa-03-guest-profiles.png");

  log("STEP 7: Service Requests + click first guest in inbox");
  await clickTab("Service Requests");
  await sleep(500);
  // Click first guest card in inbox sidebar
  try {
    const firstGuest = page.locator('[data-testid="inbox-guest"], button:has-text("Mr"), button:has-text("Ms"), button:has-text("Mrs"), button:has-text("Dr")').first();
    await firstGuest.click({ timeout: 4000 });
  } catch (e) {
    log("Inbox guest click fallback:", e.message);
    // Try first list-like clickable item under the sidebar
    try {
      const sidebar = page.locator('aside').first();
      const item = sidebar.locator('button, [role="button"], li').nth(2);
      await item.click({ timeout: 4000 });
    } catch (e2) {
      log("Sidebar fallback also failed:", e2.message);
    }
  }
  await sleep(500);
  await shot("qa-04-service-with-guest.png");

  log("STEP 8: Activities");
  await clickTab("Activities");
  await shot("qa-05-activities.png");

  log("STEP 9: Folio");
  await clickTab("Folio");
  await sleep(800);
  await shot("qa-06-folio.png");

  log("STEP 10: Reports");
  await clickTab("Reports");
  await shot("qa-07-reports.png");

  log("STEP 11: Setup + sub-sections");
  await clickTab("Setup");
  await sleep(500);

  const setupSubs = [
    { label: "Property", file: "qa-08-setup-property.png" },
    { label: "Rate Codes", file: "qa-08-setup-rates.png" },
    { label: "Market Segments", file: "qa-08-setup-markets.png" },
    { label: "Departments & Routing", file: "qa-08-setup-departments.png" },
    { label: "AI Concierge", file: "qa-08-setup-ai.png" },
    { label: "Users & Roles", file: "qa-08-setup-users.png" },
    { label: "Integration Status", file: "qa-08-setup-integrations.png" },
  ];
  for (const s of setupSubs) {
    try {
      // Find within Setup left nav
      const navItem = page.getByText(s.label, { exact: true }).first();
      await navItem.click({ timeout: 4000 });
      await sleep(500);
    } catch (e) {
      log(`Setup sub click failed for ${s.label}:`, e.message);
    }
    await shot(s.file);
  }

  log("STEP 12: Command Palette (F2)");
  await page.keyboard.press("F2");
  await sleep(500);
  await shot("qa-09-command-palette.png");
  await page.keyboard.press("Escape");
  await sleep(300);

  log("STEP 13: Service Requests -> + New Guest Profile");
  await clickTab("Service Requests");
  await sleep(500);
  try {
    const btn = page.getByRole("button", { name: /new guest profile/i }).first();
    await btn.click({ timeout: 4000 });
  } catch (e) {
    log("New Guest Profile button not found:", e.message);
    try {
      await page.getByText(/\+ ?New Guest Profile/i).first().click({ timeout: 3000 });
    } catch (e2) {
      log("fallback also failed:", e2.message);
    }
  }
  await sleep(700);
  await shot("qa-10-add-guest-modal.png");
  await page.keyboard.press("Escape");
  await sleep(400);

  log("STEP 14: Pre-Arrival Information edit");
  // Need a focused guest first - try clicking first guest again
  try {
    const firstGuest = page.locator('aside button, aside li').filter({ hasText: /\d{3}/ }).first();
    await firstGuest.click({ timeout: 3000 });
  } catch (e) {
    log("Could not click guest before pre-arrival:", e.message);
  }
  await sleep(400);
  try {
    // Find edit button near "Pre-Arrival"
    const preArrival = page.getByText(/pre-arrival/i).first();
    await preArrival.scrollIntoViewIfNeeded();
    // Click sibling edit button
    const editBtn = page.locator('button').filter({ hasText: /^(edit|add|update|✎|✏)/i }).first();
    // Try a button inside ManualInputPanel area
    const panel = page.locator(':has-text("Pre-Arrival")').first();
    // simpler: any button with title or aria-label edit near it
    let clicked = false;
    const candidates = await page.getByRole("button").all();
    for (const c of candidates) {
      try {
        const t = (await c.innerText({ timeout: 200 })).trim().toLowerCase();
        if (t.includes("edit") || t.includes("add info") || t.includes("manual")) {
          await c.click({ timeout: 1500 });
          clicked = true;
          log("Clicked candidate button with text:", t);
          break;
        }
      } catch {}
    }
    if (!clicked) {
      log("No pre-arrival edit button found by text");
    }
  } catch (e) {
    log("Pre-arrival open failed:", e.message);
  }
  await sleep(700);
  await shot("qa-11-manual-input-modal.png");

  // Click "Paste Email" tab inside the modal
  try {
    const pasteTab = page.getByText(/paste email/i).first();
    await pasteTab.click({ timeout: 3000 });
    await sleep(400);
  } catch (e) {
    log("Paste Email tab not found:", e.message);
  }
  await shot("qa-12-manual-input-email.png");
  await page.keyboard.press("Escape");
  await sleep(400);

  log("STEP 15: F1 help");
  await page.keyboard.press("F1");
  await sleep(500);
  await shot("qa-13-help-modal.png");
  await page.keyboard.press("Escape");
  await sleep(400);

  log("STEP 16: F12 New SR");
  await page.keyboard.press("F12");
  await sleep(500);
  await shot("qa-14-new-sr-modal.png");
  await page.keyboard.press("Escape");
  await sleep(400);

  log("STEP 17: /badge mobile");
  await page.setViewportSize({ width: 400, height: 850 });
  await page.goto("http://localhost:3000/badge", { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(1000);
  await shot("qa-15-badge-mobile.png");

  await browser.close();
  fs.writeFileSync(`${OUT_DIR}\\qa-log.txt`, logLines.join("\n"));
  log("DONE.");
})().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
