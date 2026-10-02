/**
 * Rutas de autenticación y verificación.
 */

import { Router } from "express";

import {
  login,
  obtenerPerfil,
  reenviarCodigo,
  registro,
  verificarCorreo,
} from "../controllers/auth.controller.js";

import { autenticarUsuario } from "../middlewares/auth.middleware.js";

import { validarCuerpo } from "../middlewares/validate.middleware.js";

import {
  loginSchema,
  reenviarCodigoSchema,
  registroSchema,
  verificarCorreoSchema,
} from "../schemas/auth.schema.js";

const router = Router();

/**
 * Crea un usuario y envía el código.
 */
router.post(
  "/auth/register",

  validarCuerpo(registroSchema),

  registro,
);

/**
 * Verifica el correo con el código de seis dígitos.
 */
router.post(
  "/auth/verify-email",

  validarCuerpo(verificarCorreoSchema),

  verificarCorreo,
);

/**
 * Envía un código nuevo.
 */
router.post(
  "/auth/resend-verification",

  validarCuerpo(reenviarCodigoSchema),

  reenviarCodigo,
);

/**
 * Inicia sesión solamente si el correo está verificado.
 */
router.post(
  "/auth/login",

  validarCuerpo(loginSchema),

  login,
);

/**
 * Devuelve el perfil autenticado.
 */
router.get(
  "/auth/me",

  autenticarUsuario,

  obtenerPerfil,
);

export default router;
