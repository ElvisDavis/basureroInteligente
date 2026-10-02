/**
 * Controladores HTTP de autenticación.
 */

import {
  iniciarSesion,
  reenviarCodigo as reenviarCodigoUsuario,
  registrarUsuario,
  verificarCorreo as verificarCorreoUsuario,
} from "../services/auth.service.js";

/**
 * Registra un usuario y envía el código.
 */
export async function registro(request, response, next) {
  try {
    const resultado = await registrarUsuario(request.validatedBody);

    return response.status(201).json({
      success: true,

      message: "Usuario registrado. Revisa tu correo para verificar la cuenta.",

      ...resultado,

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Verifica el código recibido por correo.
 */
export async function verificarCorreo(request, response, next) {
  try {
    const resultado = await verificarCorreoUsuario(request.validatedBody);

    return response.status(200).json({
      success: true,

      message: resultado.alreadyVerified
        ? "El correo ya había sido verificado."
        : "Correo verificado correctamente.",

      ...resultado,

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Envía un código nuevo.
 */
export async function reenviarCodigo(request, response, next) {
  try {
    const resultado = await reenviarCodigoUsuario(request.validatedBody);

    return response.status(200).json({
      success: true,

      message:
        "Si la cuenta existe y está pendiente, se envió un nuevo código.",

      ...resultado,

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Inicia sesión.
 */
export async function login(request, response, next) {
  try {
    const resultado = await iniciarSesion(request.validatedBody);

    return response.status(200).json({
      success: true,

      message: "Inicio de sesión correcto.",

      ...resultado,

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Devuelve el usuario asociado al JWT.
 */
export function obtenerPerfil(request, response) {
  return response.status(200).json({
    success: true,

    user: request.user,

    timestamp: new Date().toISOString(),
  });
}
