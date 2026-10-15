import { expect, test, type Page } from "@playwright/test";
import {
  hoursOwnerEmail,
  ZZTEST_ACTIVITY_LABEL,
  ZZTEST_DESCRIPTION_PREFIX,
  ZZTEST_HOURS_PASSWORD,
  readZztestRun,
  ZZTEST_WORKERS,
} from "./zztest-hours-seed";

/**
 * Due finestre dello stesso browser: un solo BrowserContext e due Page.
 *
 * È lo scenario del PC in officina. Le finestre condividono i cookie e hanno
 * sessionStorage separato. Due BrowserContext separati avrebbero jar di cookie
 * isolati: il login di B non potrebbe sovrascrivere A, e il test passerebbe
 * anche senza il riallineamento in utils/supabase/client.ts.
 *
 * Sequenza riportata: A resta sulla pagina ore, B entra e salva un'ora, A è
 * ancora A e la riga in Timetracking appartiene a B.
 */

test.describe.configure({ mode: "serial" });

test("due finestre, le ore di Bravo restano di Bravo e Alfa resta Alfa", async ({
  browser,
}) => {
  const description = `${ZZTEST_DESCRIPTION_PREFIX}${Date.now()}-${test.info().repeatEachIndex}`;
  const context = await browser.newContext();
  const alfa = await context.newPage();
  const bravo = await context.newPage();

  try {
    await quickLogin(alfa, ZZTEST_WORKERS.alfa.displayName);
    await openHours(alfa);
    await expect(alfa.getByText(`Ciao ${ZZTEST_WORKERS.alfa.displayName}`)).toBeVisible();

    await quickLogin(bravo, ZZTEST_WORKERS.bravo.displayName);
    await openHours(bravo);
    await expect(bravo.getByText(`Ciao ${ZZTEST_WORKERS.bravo.displayName}`)).toBeVisible();
    await saveInternalHour(bravo, description);

    await expect(alfa.getByText(`Ciao ${ZZTEST_WORKERS.alfa.displayName}`)).toBeVisible();
    expect(await authEmail(alfa)).toBe(ZZTEST_WORKERS.alfa.email);

    await alfa.reload({ waitUntil: "domcontentloaded" });
    await dismissGuide(alfa);
    await expect(alfa.getByText(`Ciao ${ZZTEST_WORKERS.alfa.displayName}`)).toBeVisible();
    expect(await authEmail(alfa)).toBe(ZZTEST_WORKERS.alfa.email);

    expect(await hoursOwnerEmail(description)).toBe(ZZTEST_WORKERS.bravo.email);
  } finally {
    await context.close();
  }
});

async function quickLogin(page: Page, displayName: string): Promise<void> {
  const { subdomain } = readZztestRun();
  await page.goto(`/quick-login/${subdomain}`, {
    waitUntil: "domcontentloaded",
  });
  const profile = page.locator("button").filter({ hasText: displayName });
  await expect(profile).toBeVisible();
  await expect(async () => {
    await profile.click();
    await expect(page.locator("#quick-password")).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.locator("#quick-password").fill(ZZTEST_HOURS_PASSWORD);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL(/\/sites\/select/, { timeout: 90_000 });
}

async function openHours(page: Page): Promise<void> {
  const { subdomain } = readZztestRun();
  await page.goto(`/sites/${subdomain}/timetracking/create`, {
    waitUntil: "domcontentloaded",
  });
  await dismissGuide(page);
  await expect(page.getByText("Registra ore", { exact: true }).first()).toBeVisible();
}

async function dismissGuide(page: Page): Promise<void> {
  const close = page.getByRole("button", { name: "Chiudi guida" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

async function saveInternalHour(page: Page, description: string): Promise<void> {
  const activitySelect = page.getByRole("combobox").filter({ hasText: "Seleziona attività..." });
  await expect(async () => {
    await dismissGuide(page);
    await page.locator('label[for="internal-0"]').click();
    await expect(activitySelect).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await activitySelect.click();
  await page.getByRole("option", { name: ZZTEST_ACTIVITY_LABEL }).click();
  await page.getByRole("button", { name: "1h", exact: true }).click();
  await page.getByPlaceholder("Descrizione attività...").fill(description);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/time-tracking/create") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /^Salva \(/ }).click();
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(
      `Salvataggio ore fallito (${response.status()}): ${await response.text()}`,
    );
  }
}

async function authEmail(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!response.ok) return null;
    const body = (await response.json()) as { user?: { email?: string } };
    return body.user?.email ?? null;
  });
}
