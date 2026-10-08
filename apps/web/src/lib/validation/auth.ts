import { z } from "zod";

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Pon al menos 2 caracteres.").max(60),
  email: z.string().trim().email("Correo no válido."),
  password: z
    .string()
    .min(10, "Mínimo 10 caracteres.")
    .regex(/[a-z]/, "Incluye al menos una minúscula.")
    .regex(/[A-Z]/, "Incluye al menos una mayúscula.")
    .regex(/[0-9]/, "Incluye al menos un número."),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Correo no válido."),
  password: z.string().min(1, "Pon tu contraseña."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
