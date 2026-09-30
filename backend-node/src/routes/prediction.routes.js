/**
 * Rutas relacionadas con clasificación y depósitos.
 */

import { Router } from "express";

import {
    obtenerDepositos,
    predecirResiduo,
} from "../controllers/prediction.controller.js";
import {
    autenticarUsuario,
} from "../middlewares/auth.middleware.js";
import {
    recibirImagen,
} from "../middlewares/upload.middleware.js";

const router = Router();

/**
 * La autenticación se ejecuta antes de recibir la imagen.
 *
 * Esto evita mantener archivos en memoria para solicitudes
 * que no pertenecen a un usuario autenticado.
 */
router.post(
    "/deposits/predict",
    autenticarUsuario,
    recibirImagen,
    predecirResiduo
);

/**
 * Historial del usuario autenticado.
 */
router.get(
    "/deposits",
    autenticarUsuario,
    obtenerDepositos
);

export default router;