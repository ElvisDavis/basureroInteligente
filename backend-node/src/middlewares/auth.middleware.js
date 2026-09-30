/**
 * Valida el token JWT enviado por Flutter.
 */

import jwt from "jsonwebtoken";

import { prisma } from "../config/database.js";
import { env } from "../config/env.js";

function crearErrorAutenticacion(
    message,
    code
) {
    const error = new Error(message);

    error.statusCode = 401;
    error.code = code;

    return error;
}

export async function autenticarUsuario(
    request,
    _response,
    next
) {
    try {
        const authorization =
            request.headers.authorization;

        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {
            throw crearErrorAutenticacion(
                "Debe proporcionar un token de acceso.",
                "AUTH_TOKEN_REQUIRED"
            );
        }

        const token = authorization.slice(
            "Bearer ".length
        );

        let contenido;

        try {
            contenido = jwt.verify(
                token,
                env.JWT_SECRET,
                {
                    issuer: "reciclaje-backend",
                    audience: "reciclaje-flutter",
                }
            );
        } catch {
            throw crearErrorAutenticacion(
                "El token es inválido o ha expirado.",
                "INVALID_AUTH_TOKEN"
            );
        }

        if (
            typeof contenido !== "object" ||
            typeof contenido.sub !== "string"
        ) {
            throw crearErrorAutenticacion(
                "El token no contiene un usuario válido.",
                "INVALID_AUTH_TOKEN"
            );
        }

        const usuario = await prisma.user.findUnique({
            where: {
                id: contenido.sub,
            },
            select: {
                id: true,
                name: true,
                email: true,
                points: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!usuario || !usuario.isActive) {
            throw crearErrorAutenticacion(
                "El usuario no está disponible.",
                "USER_NOT_AVAILABLE"
            );
        }

        /**
         * Los controladores posteriores pueden acceder
         * al usuario mediante request.user.
         */
        request.user = usuario;

        return next();
    } catch (error) {
        return next(error);
    }
}