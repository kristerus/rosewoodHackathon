import { chromium } from "file:///C:/Users/kerpu/.vscode/schematiq/node_modules/.pnpm/playwright@1.59.1/node_modules/playwright/index.mjs";

const OUT_DIR = "C:\\Users\\kerpu\\.vscode\\rosewoodhackethon\\screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Users\\kerpu\\AppData\\Local\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await sleep(2500);

  // Dismiss any modal (welcome / help) by pressing escape twice
  await page.keyboard.press("Escape");
  await sleep(200);
  await page.keyboard.press("Escape");
  await sleep(300);

  // Make sure we're on Service Requests
  try {
    await page.getByRole("button", { name: /^Service Requests$/ }).first().click({ timeout: 3000 });
  } catch {}
  await sleep(400);

  // Click first guest in inbox sidebar
  try {
    const firstInboxItem = page.locator("aside button, aside [role='button']").first();
    await firstInboxItem.click({ timeout: 3000 });
  } catch (e) {
    console.log("first inbox click failed:", e.message);
  }
  await sleep(800);

  // Click "Add Pre-Arrival Info" or "+ Add" in Pre-Arrival section
  let clicked = false;
  for (const sel of [
    'button:has-text("Add Pre-Arrival Info")',
    'button:has-text("+ Add")',
    'button:has-text("Edit")',
  ]) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        await loc.click({ timeout: 2000 });
        clicked = true;
        console.log("clicked", sel);
        break;
      }
    } catch (e) {
      console.log("sel fail", sel, e.message);
    }
  }
  if (!clicked) console.log("no pre-arrival button found");

  await sleep(900);
  await page.screenshot({ path: `${OUT_DIR}\\qa-11-manual-input-modal.png` });

  // Click Paste Email tab in modal
  try {
    const pasteBtn = page.locator('button:has-text("Paste Email"), [role="tab"]:has-text("Paste Email")').first();
    await pasteBtn.click({ timeout: 3000 });
    await sleep(500);
  } catch (e) {
    console.log("paste tab click failed:", e.message);
  }
  await page.screenshot({ path: `${OUT_DIR}\\qa-12-manual-input-email.png` });

  await browser.close();
  console.log("DONE.");
})();
