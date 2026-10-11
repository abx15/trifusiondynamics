import { firefox } from 'playwright';

async function testClientTickets() {
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

  console.log('1. Going to login page...');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });

  console.log('2. Clicking Client preset button...');
  // The preset button for Client has text "Client"
  const clientBtn = page.locator('button:has-text("Client")').first();
  await clientBtn.click();

  console.log('3. Submitting login form...');
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  console.log('Waiting for navigation...');
  await page.waitForURL('**/client/**', { timeout: 15000 }).catch(e => console.log('Navigation wait timeout:', e.message));

  console.log('Current URL after login:', page.url());

  console.log('4. Navigating to http://localhost:3001/client/tickets ...');
  await page.goto('http://localhost:3001/client/tickets', { waitUntil: 'networkidle' });
  console.log('Tickets URL:', page.url());

  // Check what is rendered on screen
  const bodyText = await page.innerText('body');
  console.log('Tickets page body snippet:\n', bodyText.slice(0, 800));

  // Check if "Create New Ticket" button exists
  const createBtn = page.locator('button:has-text("Create New Ticket")');
  const count = await createBtn.count();
  console.log('Create New Ticket button count:', count);
  if (count > 0) {
    const isVisible = await createBtn.isVisible();
    const isEnabled = await createBtn.isEnabled();
    console.log('Create New Ticket button visible:', isVisible, 'enabled:', isEnabled);

    console.log('5. Clicking Create New Ticket button...');
    await createBtn.click();
    await page.waitForTimeout(1000);

    const modalVisible = await page.locator('text=Raise New Support Ticket').isVisible();
    console.log('Is modal visible after click?', modalVisible);
  }

  await browser.close();
}

testClientTickets().catch(err => console.error('TEST ERROR:', err));

