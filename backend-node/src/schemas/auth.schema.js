/**
 * Validaciones de entrada para registor e incio de sesion 
 */
import { z } from "zod";

export const registroSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "El nombre debe tener al menos dos caracteres")
        .max(80, "El nombre no puede superar 80 caracteres"),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("El correo electronico no es valido")
        .max(150, "El correo es demasiado largo"),
    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(72, "La contraseña no debe superar 72 caracteres")
        .regex(/[A-Za-z]/, "La contraseña debe contener al menos una letra")
        .regex(/[0-9]/, "La contraseña debe contener al menos un número"),


});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("El correo electronico no es valido"),
    password: z
        .string()
        .min(1, "La contraseña es obligatoria"),
});