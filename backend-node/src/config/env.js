/**
 * Configuración central de variables de entorno.
 * 
 * Este módulo:
 * 1. Carga el archivo .env
 * 2. Valida las variables con Zod
 * 3. Detiene el backend si la configuración es invalida
 * 
 * Ningún otro mpodulo debería acceder directamente a process.env
 */

import "dotenv/config";
import { z } from "zod";

/**
 * Esquema de configuración 
 * 
 * z.coerce.number() convierte el puerto recibido como texto
 * en un número antes de validarlo
 */
const esquemaEntorno = z.object({
    PORT: z.coerce
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(3000),
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    AI_API_URL: z
        .string()
        .url()
        .default("http://127.0.0.1:8000"),

    CORS_ORIGIN: z
        .string()
        .default("*"),

    AI_API_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .min(1000)
        .max(120000)
        .default(30000),

    /**
 * Dirección de conexión a PostgreSQL.
 */
    DATABASE_URL: z
        .string()
        .min(
            1,
            "DATABASE_URL es obligatoria"
        ),

    /**
     * Clave privada utilizada para firmar los JWT.
     */
    JWT_SECRET: z
        .string()
        .min(
            32,
            "JWT_SECRET debe tener al menos 32 caracteres"
        ),

    /**
     * Duración del inicio de sesión.
     */
    JWT_EXPIRES_IN: z
        .string()
        .default("8h"),
});

/**
 * safeParse permite controlar el error sin mostrar información 
 * sensible ni un traceback innecesario
 */
const resultado = esquemaEntorno.safeParse(process.env);

if (!resultado.success) {
    console.error("Configuración inválida del backend:");

    console.error(z.prettifyError(resultado.error));

    process.exit(1);
}

/**
 * Objeto inmutable utilizado por toda la aplicación 
 */
export const env = Object.freeze(resultado.data);







