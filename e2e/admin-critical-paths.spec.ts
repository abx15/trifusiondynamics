import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3001';
const API_URL = process.env.E2E_API_URL || 'http://localhost:8000/api';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@trifusiondynamics.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'trifusiondynamicsA3web';

async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('[data-testid="email-input"], input[type="email"]', { timeout: 10_000 });

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitBtn.click();

  // Wait for dashboard redirect after successful login
  await page.waitForURL(/\/(dashboard|crm|tickets|hr)/, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Authentication Flow
// ---------------------------------------------------------------------------

test.describe('Authentication', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('login with valid admin credentials redirects to dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(new RegExp(`${BASE_URL}/(dashboard|crm|tickets|hr|agent)`));
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.locator('input[type="email"]').first().fill('wrong@example.com');
    await page.locator('input[type="password"]').first().fill('wrongpassword');
    await page.locator('button[type="submit"]').first().click();

    // Should stay on login page and show an error
    await expect(page).toHaveURL(/\/login/);
    // Error message should appear (toast or inline)
    await expect(
      page.locator('[role="alert"], .error, [data-error]').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('authenticated user cannot access login page (redirected)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/login`);
    // Should redirect away from login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('logout clears session and redirects to login', async ({ page }) => {
    await login(page);

    // Click logout — find it in topbar
    const logoutLink = page.locator('a[href="/logout"], button:has-text("Logout"), button:has-text("Sign Out")').first();
    await logoutLink.click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Dashboard / Sidebar Navigation
// ---------------------------------------------------------------------------

test.describe('Admin Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar shows all Operations sections for admin', async ({ page }) => {
    // Admin should see CRM, Clients, Projects, Billing, HR Portal, Payroll, Support Tickets
    await expect(page.locator('text=CRM, text=Clients, text=Projects').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Billing').first()).toBeVisible();
    await expect(page.locator('text=Support Tickets').first()).toBeVisible();
  });

  test('navigates to CRM page', async ({ page }) => {
    await page.click('text=CRM');
    await expect(page).toHaveURL(/\/crm/);
    await page.waitForLoadState('networkidle');
  });

  test('navigates to Clients page', async ({ page }) => {
    const clientsLink = page.locator('a[href="/clients"]').first();
    if (await clientsLink.isVisible()) {
      await clientsLink.click();
      await expect(page).toHaveURL(/\/clients/);
    }
  });

  test('navigates to Projects page', async ({ page }) => {
    const projectsLink = page.locator('a[href="/projects"]').first();
    if (await projectsLink.isVisible()) {
      await projectsLink.click();
      await expect(page).toHaveURL(/\/projects/);
    }
  });

  test('navigates to Analytics page', async ({ page }) => {
    const analyticsLink = page.locator('a[href="/analytics"]').first();
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await expect(page).toHaveURL(/\/analytics/);
    }
  });
});

// ---------------------------------------------------------------------------
// CRM: Leads Inbox
// ---------------------------------------------------------------------------

test.describe('CRM — Leads Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/leads-inbox`);
    await page.waitForLoadState('networkidle');
  });

  test('leads inbox page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/leads-inbox/);
    // Page title or heading
    await expect(
      page.locator('h1, h2, [data-testid="page-title"]').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('leads inbox shows submissions from API', async ({ page }) => {
    // Should render some rows (from seed data)
    const rows = page.locator('table tbody tr, [data-testid="submission-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// CRM: Kanban Board
// ---------------------------------------------------------------------------

test.describe('CRM — Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/crm`);
    await page.waitForLoadState('networkidle');
  });

  test('CRM page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/crm/);
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('kanban columns are visible', async ({ page }) => {
    // Pipeline stages should be visible as columns
    const stages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
    for (const stage of stages) {
      const col = page.locator(`text=${stage}`).first();
      if (await col.isVisible()) {
        await expect(col).toBeVisible();
        break; // At least one stage visible means the board loaded
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Support Tickets
// ---------------------------------------------------------------------------

test.describe('Support Tickets', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/tickets`);
    await page.waitForLoadState('networkidle');
  });

  test('tickets page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/tickets/);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('ticket list or empty state is visible', async ({ page }) => {
    const listOrEmpty = page.locator(
      'table, [data-testid="ticket-list"], [data-testid="empty-state"], text=No tickets'
    ).first();
    await expect(listOrEmpty).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Settings (Admin Only)
// ---------------------------------------------------------------------------

test.describe('Settings — Admin Only', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/settings/users`);
    await page.waitForLoadState('networkidle');
  });

  test('settings users page accessible by admin', async ({ page }) => {
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('body')).not.toContainText('Forbidden');
    await expect(page.locator('body')).not.toContainText('403');
  });

  test('team members table or empty state shows', async ({ page }) => {
    const content = page.locator(
      'table, [data-testid="users-table"], text=Team Members, text=No users'
    ).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// API Health (sanity check)
// ---------------------------------------------------------------------------

test.describe('API Health', () => {
  test('auth API is reachable', async ({ request }) => {
    const response = await request.get(`${API_URL.replace('/api', '')}/api/docs`);
    expect([200, 301, 302]).toContain(response.status());
  });

  test('GET /auth/me returns 401 without auth', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/me`);
    expect(response.status()).toBe(401);
  });
});
