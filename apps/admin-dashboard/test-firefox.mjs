import { firefox } from 'playwright';

async function testBrowser() {
  console.log('Launching Firefox...');
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });

  console.log('Navigating to http://localhost:3001/client/tickets ...');
  await page.goto('http://localhost:3001/client/tickets', { waitUntil: 'networkidle' });
  console.log('Current URL:', page.url());

  const title = await page.title();
  console.log('Page Title:', title);

  const bodyText = await page.innerText('body');
  console.log('Body snippet:', bodyText.slice(0, 300));

  await browser.close();
}

testBrowser().catch(err => console.error('TEST ERROR:', err));

