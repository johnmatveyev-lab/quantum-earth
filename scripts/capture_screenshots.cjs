const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8081';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    dumpio: true,
    timeout: 60000,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--use-angle=metal',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  // Landing page
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'public/screenshots/landing.png', fullPage: true });
  console.log('Saved public/screenshots/landing.png');

  // App page
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: 'public/screenshots/app.png', fullPage: true });
  console.log('Saved public/screenshots/app.png');

  // Try to open voice panel
  try {
    await page.waitForSelector('button[data-testid="voice-control-toggle"]', { timeout: 10000 });
    await page.click('button[data-testid="voice-control-toggle"]');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'public/screenshots/voice.png', fullPage: true });
    console.log('Saved public/screenshots/voice.png');
  } catch (e) {
    console.log('Voice button not found:', e.message);
  }

  await browser.close();
})();
