import { expect, test } from "@playwright/test";

// Flujos sin autenticar: corre sin la sesión guardada del líder de ejemplo.
test.use({ storageState: { cookies: [], origins: [] } });

test("visiting a protected page redirects to login", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
});

test("wrong password shows an error instead of logging in", async ({ page }) => {
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo").fill("lider@demo.test");
  await page.getByRole("textbox", { name: /^Contraseña/ }).fill("wrong-password");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
});

test("an expired confirmation link shows the banner", async ({ page }) => {
  await page.goto("/iniciar-sesion?error=callback");
  await expect(page.getByText("El enlace ha caducado o ya se usó. Inicia sesión de nuevo.")).toBeVisible();
});
