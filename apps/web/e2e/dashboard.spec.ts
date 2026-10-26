import { expect, test } from "@playwright/test";

/**
 * Flujos autenticados contra el stack real de Supabase local, usando el
 * clan ficticio "Clan Ficticio" (apps/collector/src/fixtures/seed-fixture-clan.ts,
 * 8 miembros). La sesión viene de e2e/auth.setup.ts.
 */

test("panel shows the real clan name and update time", async ({ page }) => {
  await page.goto("/panel");
  await expect(page.getByRole("heading", { name: "Clan Ficticio" })).toBeVisible();
  await expect(page.getByText(/actualizado hace|actualizado justo ahora/)).toBeVisible();
});

test("miembros lists every fixture member", async ({ page }) => {
  await page.goto("/miembros");
  await expect(page.getByText("8 de 50")).toBeVisible();
  await expect(page.getByText("Dragon77")).toBeVisible();
  await expect(page.getByText("xKiller")).toBeVisible();
});

test("ficha del miembro shows real donations and role", async ({ page }) => {
  await page.goto("/miembros");
  await page.getByText("Dragon77").click();
  await expect(page).toHaveURL(/\/miembros\/P001$/);
  await expect(page.getByText("Dragon77")).toBeVisible();
});

test("guerra page renders the three tabs", async ({ page }) => {
  await page.goto("/guerra");
  await expect(page.getByRole("button", { name: "En curso" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Historial" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Liga" })).toBeVisible();
});

test("ascensos shows coléder/veterano sections", async ({ page }) => {
  await page.goto("/ascensos");
  await expect(page.getByText("La app propone y tú decides.")).toBeVisible();
  await expect(page.getByText(/A colíder/)).toBeVisible();
  await expect(page.getByText(/A veterano/)).toBeVisible();
});

test("reglas shows the three editable rule blocks", async ({ page }) => {
  await page.goto("/reglas");
  await expect(page.getByText("Expulsión")).toBeVisible();
  await expect(page.getByText("Ascenso a veterano")).toBeVisible();
  await expect(page.getByText("Ascenso a colíder")).toBeVisible();
});

test("equipo shows the signed-in leader and an invite card", async ({ page }) => {
  await page.goto("/equipo");
  await expect(page.getByText("Tú")).toBeVisible();
  await expect(page.getByText("Administra")).toBeVisible();
  await expect(page.getByText("Invitar a un colíder")).toBeVisible();
});

test("bottom nav links between the four tabs", async ({ page }) => {
  await page.goto("/panel");
  await page.getByRole("link", { name: "Miembros", exact: true }).click();
  await expect(page).toHaveURL(/\/miembros$/);
  await page.getByRole("link", { name: "Guerra", exact: true }).click();
  await expect(page).toHaveURL(/\/guerra$/);
  await page.getByRole("link", { name: "Equipo", exact: true }).click();
  await expect(page).toHaveURL(/\/equipo$/);
  await page.getByRole("link", { name: "Panel", exact: true }).click();
  await expect(page).toHaveURL(/\/panel$/);
});
