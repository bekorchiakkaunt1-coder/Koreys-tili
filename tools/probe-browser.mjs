// Opens the live Pages Mini App in WebKit and Chromium with a fake Telegram object
// (invalid initData) against the real API. Expected: the AUTH_INVALID message, which
// proves fetch + redirect + CORS work in that engine. Used by .github/workflows/api-probe.yml.
import { webkit, chromium } from 'playwright';

const URL = 'https://bekorchiakkaunt1-coder.github.io/Koreys-tili/';
for (const [name, engine] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await engine.launch();
  const page = await browser.newPage({ userAgent: name === 'webkit'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' : undefined });
  const log = [];
  page.on('console', (m) => log.push(m.type() + ': ' + m.text()));
  page.on('requestfailed', (r) => log.push('requestfailed: ' + r.url().slice(0, 80) + ' ' + (r.failure() && r.failure().errorText)));
  page.on('response', (r) => { if (/script\.google/.test(r.url())) log.push('response: ' + r.status() + ' ' + r.url().slice(0, 60) + ' acao=' + r.headers()['access-control-allow-origin']); });
  await page.route('https://telegram.org/**', (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.addInitScript(() => {
    window.Telegram = { WebApp: {
      initData: 'user=%7B%22id%22%3A1%7D&auth_date=1&hash=00', ready() {}, expand() {}, isVersionAtLeast: () => true,
      disableVerticalSwipes() {}, BackButton: { onClick() {}, show() {}, hide() {} }, onEvent() {},
    } };
  });
  await page.goto(URL);
  await page.waitForSelector('.error', { timeout: 30000 }).catch(() => {});
  console.log(`[${name}]`, (await page.textContent('#app')).replace(/\s+/g, ' ').trim());
  log.forEach((l) => console.log(`[${name}]   ${l}`));
  await browser.close();
}
