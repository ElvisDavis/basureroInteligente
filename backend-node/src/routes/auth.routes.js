/**
 * Rutas de registro, login y perfil.
 */

import { Router } from "express";

import {
    login,
    obtenerPerfil,
    registro,
} from "../controllers/auth.controller.js";
import {
    autenticarUsuario,
} from "../middlewares/auth.middleware.js";
import {
    validarCuerpo,
} from "../middlewares/validate.middleware.js";
import {
    loginSchema,
    registroSchema,
} from "../schemas/auth.schema.js";

const router = Router();

router.post(
    "/auth/register",
    validarCuerpo(registroSchema),
    registro
);

router.post(
    "/auth/login",
    validarCuerpo(loginSchema),
    login
);

router.get(
    "/auth/me",
    autenticarUsuario,
    obtenerPerfil
);

export default router;