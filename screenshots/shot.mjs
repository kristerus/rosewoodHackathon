import { chromium } from "playwright";

const OUT_DIR = "C:\\Users\\kerpu\\.vscode\\rosewoodhackethon\\screenshots";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    if (msg.type() === "error") console.log("PAGE-ERR:", msg.text());
  });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });
  await sleep(700);

  console.log("Saving 01-initial.png");
  await page.screenshot({ path: `${OUT_DIR}\\01-initial.png`, fullPage: true });

  // Click the "Restaurant rec" sample-transcript button
  console.log("Clicking 'Restaurant rec' ...");
  const restBtn = page.getByRole("button", { name: "Restaurant rec" });
  await restBtn.click();

  // Wait for typewriter + Claude API call (will fail)
  await sleep(5000);

  console.log("Saving 02-after-click.png");
  await page.screenshot({ path: `${OUT_DIR}\\02-after-click.png`, fullPage: true });

  // Click "Generate Brief" button in OperaProfilePanel
  console.log("Clicking 'Generate Brief' ...");
  try {
    const briefBtn = page.getByRole("button", { name: /generate brief/i });
    await briefBtn.click({ timeout: 5000 });
  } catch (e) {
    console.log("Generate Brief click failed (maybe no focused guest):", e.message);
    // Try to focus a guest first then re-attempt
    try {
      const select = page.locator('select').first();
      await select.selectOption({ index: 1 });
      await sleep(500);
      const briefBtn = page.getByRole("button", { name: /generate brief/i });
      await briefBtn.click({ timeout: 5000 });
      console.log("Clicked Generate Brief after selecting guest.");
    } catch (e2) {
      console.log("Still failed:", e2.message);
    }
  }

  await sleep(3000);

  console.log("Saving 03-brief-clicked.png");
  await page.screenshot({ path: `${OUT_DIR}\\03-brief-clicked.png`, fullPage: true });

  await browser.close();
  console.log("DONE.");
})().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
