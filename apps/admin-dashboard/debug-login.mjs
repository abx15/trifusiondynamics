import { firefox } from 'playwright';

async function debugLogin() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('response', async res => {
    if (res.url().includes('/auth/login')) {
      console.log('LOGIN STATUS:', res.status());
      try {
        const body = await res.text();
        console.log('LOGIN BODY:', body);
      } catch (e) {}
    }
  });

  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });

  // Click Client preset
  const clientBtn = page.locator('button:has-text("Client")').first();
  await clientBtn.click();

  const emailVal = await page.locator('input[type="email"]').inputValue().catch(() => '');
  console.log('Email input after preset click:', emailVal);

  // If email input is empty or preset didn't fill it, check inputs:
  const inputs = await page.locator('input').all();
  for (let i = 0; i < inputs.length; i++) {
    const val = await inputs[i].inputValue();
    const type = await inputs[i].getAttribute('type');
    const placeholder = await inputs[i].getAttribute('placeholder');
    console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, val=${val}`);
  }

  // Click submit
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  await page.waitForTimeout(3000);
  console.log('URL after submit:', page.url());

  const errEl = await page.locator('text=Invalid').count();
  console.log('Error "Invalid" count:', errEl);

  await browser.close();
}

debugLogin().catch(console.error);

