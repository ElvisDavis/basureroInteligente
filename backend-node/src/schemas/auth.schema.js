/**
 * Validaciones de autenticación y verificación.
 */

import { z } from "zod";

/**
 * Esquema reutilizado en todas las operaciones
 * que reciben un correo.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("El correo electrónico no es válido")
  .max(150, "El correo es demasiado largo");

/**
 * Registro de un usuario.
 */
export const registroSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos dos caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),

  email: emailSchema,

  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña no debe superar 72 caracteres")
    .regex(/[A-Za-z]/, "La contraseña debe contener al menos una letra")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
});

/**
 * Inicio de sesión.
 */
export const loginSchema = z.object({
  email: emailSchema,

  password: z.string().min(1, "La contraseña es obligatoria"),
});

/**
 * Verificación del código recibido por correo.
 */
export const verificarCorreoSchema = z.object({
  email: emailSchema,

  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código debe contener exactamente 6 dígitos"),
});

/**
 * Solicitud de un nuevo código.
 */
export const reenviarCodigoSchema = z.object({
  email: emailSchema,
});
