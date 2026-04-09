const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    dumpio: true,
    timeout: 60000,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  await page.goto('http://localhost:8081/app');
  console.log('Navigated to localhost:8081/app');

  // wait for load
  await page.waitForSelector('#root', { timeout: 10000 });
  await page.waitForFunction(() => {
    const root = document.querySelector('#root');
    return root && root.children.length > 0;
  }, { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  // click the voice button (LiveKit)
  console.log("Clicking Voice AI button...");
  let clicked = false;
  try {
    await page.waitForSelector('button[data-testid="voice-control-toggle"]', { timeout: 10000 });
    await page.click('button[data-testid="voice-control-toggle"]');
    clicked = true;
  } catch {
    const rootInfo = await page.evaluate(() => {
      const root = document.querySelector('#root');
      return {
        hasRoot: !!root,
        childCount: root ? root.children.length : 0,
        textSnippet: root ? (root.textContent || '').slice(0, 200) : '',
      };
    });
    console.log("Root debug:", JSON.stringify(rootInfo, null, 2));
    const debug = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map((b) => ({
        text: b.textContent?.trim() || '',
        title: b.getAttribute('title') || '',
        testid: b.getAttribute('data-testid') || '',
        className: b.className || '',
      }));
      return { buttonCount: buttons.length, buttons: buttons.slice(0, 20) };
    });
    console.log("Button debug:", JSON.stringify(debug, null, 2));
    clicked = false;
  }
  console.log("Button clicked?", clicked);

  await new Promise(r => setTimeout(r, 4000));

  const panelVisible = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return spans.some(s => s.textContent && s.textContent.includes('VOICE COPILOT'));
  }).catch(() => false);
  console.log("Voice panel visible?", panelVisible);

  await browser.close();
})();
