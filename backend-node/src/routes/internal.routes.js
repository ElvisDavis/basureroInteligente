/**
 * Rutas internas para dispositivos físicos.
 *
 * Flutter nunca debe consumir estas rutas.
 */
import { Router } from "express";

import {
    confirmarDepositoFisico,
} from "../controllers/device.controller.js";
import {
    autenticarDispositivo,
} from "../middlewares/device.middleware.js";

const router = Router();

router.post(
    "/internal/deposits/:depositId/confirm",
    autenticarDispositivo,
    confirmarDepositoFisico
);

export default router;