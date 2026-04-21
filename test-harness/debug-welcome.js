const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  // ウェルカム画面を直接表示するため localStorage をクリア
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/00_welcome.png', fullPage: false });
  await page.screenshot({ path: 'test-results/ui/00_welcome_full.png', fullPage: true });
  await browser.close();
  console.log('done');
})();
