/**
 * Operaciones de registro, login y generación de tokens.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../config/database.js";
import { env } from "../config/env.js";

/**
 * Cantidad de rondas utilizadas para proteger la contraseña.
 */
const RONDAS_BCRYPT = 12;

/**
 * Campos públicos que pueden devolverse al cliente.
 *
 * passwordHash nunca debe formar parte de una respuesta.
 */
const camposUsuarioPublico = {
    id: true,
    name: true,
    email: true,
    points: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
};

function crearError(
    message,
    statusCode,
    code
) {
    const error = new Error(message);

    error.statusCode = statusCode;
    error.code = code;

    return error;
}

/**
 * Genera un token de sesión para Flutter.
 */
function generarToken(usuario) {
    return jwt.sign(
        {
            email: usuario.email,
        },
        env.JWT_SECRET,
        {
            subject: usuario.id,
            expiresIn: env.JWT_EXPIRES_IN,
            issuer: "reciclaje-backend",
            audience: "reciclaje-flutter",
        }
    );
}

/**
 * Registra un usuario nuevo.
 */
export async function registrarUsuario(datos) {
    const emailNormalizado =
        datos.email.trim().toLowerCase();

    const usuarioExistente =
        await prisma.user.findUnique({
            where: {
                email: emailNormalizado,
            },
            select: {
                id: true,
            },
        });

    if (usuarioExistente) {
        throw crearError(
            "Ya existe un usuario registrado con este correo.",
            409,
            "EMAIL_ALREADY_REGISTERED"
        );
    }

    const passwordHash = await bcrypt.hash(
        datos.password,
        RONDAS_BCRYPT
    );

    try {
        const usuario = await prisma.user.create({
            data: {
                name: datos.name.trim(),
                email: emailNormalizado,
                passwordHash,
            },
            select: camposUsuarioPublico,
        });

        return {
            user: usuario,
            token: generarToken(usuario),
        };
    } catch (error) {
        /**
         * P2002 indica una restricción única duplicada.
         * También protege frente a registros simultáneos.
         */
        if (error.code === "P2002") {
            throw crearError(
                "Ya existe un usuario registrado con este correo.",
                409,
                "EMAIL_ALREADY_REGISTERED"
            );
        }

        throw error;
    }
}

/**
 * Inicia sesión sin revelar si falló el correo o la contraseña.
 */
export async function iniciarSesion(datos) {
    const emailNormalizado =
        datos.email.trim().toLowerCase();

    const usuario = await prisma.user.findUnique({
        where: {
            email: emailNormalizado,
        },
    });

    const credencialesInvalidas = crearError(
        "Correo o contraseña incorrectos.",
        401,
        "INVALID_CREDENTIALS"
    );

    if (!usuario) {
        throw credencialesInvalidas;
    }

    const passwordValida = await bcrypt.compare(
        datos.password,
        usuario.passwordHash
    );

    if (!passwordValida) {
        throw credencialesInvalidas;
    }

    if (!usuario.isActive) {
        throw crearError(
            "La cuenta se encuentra desactivada.",
            403,
            "USER_DISABLED"
        );
    }

    const usuarioPublico = {
        id: usuario.id,
        name: usuario.name,
        email: usuario.email,
        points: usuario.points,
        isActive: usuario.isActive,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
    };

    return {
        user: usuarioPublico,
        token: generarToken(usuario),
    };
}