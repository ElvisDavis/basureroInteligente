/**
 * Controladores HTTP de autenticación.
 */

import {
    iniciarSesion,
    registrarUsuario,
} from "../services/auth.service.js";

export async function registro(
    request,
    response,
    next
) {
    try {
        const resultado =
            await registrarUsuario(
                request.validatedBody
            );

        return response.status(201).json({
            success: true,
            message:
                "Usuario registrado correctamente.",
            ...resultado,
            timestamp:
                new Date().toISOString(),
        });
    } catch (error) {
        return next(error);
    }
}

export async function login(
    request,
    response,
    next
) {
    try {
        const resultado =
            await iniciarSesion(
                request.validatedBody
            );

        return response.status(200).json({
            success: true,
            message:
                "Inicio de sesión correcto.",
            ...resultado,
            timestamp:
                new Date().toISOString(),
        });
    } catch (error) {
        return next(error);
    }
}

/**
 * Devuelve el usuario asociado al JWT.
 */
export function obtenerPerfil(
    request,
    response
) {
    return response.status(200).json({
        success: true,
        user: request.user,
        timestamp:
            new Date().toISOString(),
    });
}