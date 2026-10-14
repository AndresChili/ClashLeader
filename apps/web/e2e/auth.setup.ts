import { expect, test as setup } from "@playwright/test";

const STORAGE_STATE = "e2e/.auth/demo-leader.json";

/**
 * Inicia sesión una vez como el líder de ejemplo del seed (supabase/seed.sql)
 * y guarda la cookie de sesión real, para que el resto de la suite empiece
 * ya autenticada en vez de repetir el formulario de login en cada test.
 */
setup("authenticate as the demo leader", async ({ page }) => {
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo").fill("lider@demo.test");
  await page.getByLabel("Contraseña").fill("demo12345");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/panel$/);
  await page.context().storageState({ path: STORAGE_STATE });
});
