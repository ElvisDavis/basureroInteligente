/**
 * Conexión centralizada con PostgreSQL mediante Prisma.
 *
 * Toda la aplicación reutiliza esta instancia. Crear una instancia
 * nueva en cada controlador produciría conexiones innecesarias.
 */

import { PrismaClient } from "@prisma/client";

import { env } from "./env.js";

/**
 * Durante el desarrollo mostramos advertencias y errores.
 * Durante las pruebas solamente mostramos errores.
 */
const nivelesRegistro =
    env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"];

export const prisma = new PrismaClient({
    log: nivelesRegistro,
});