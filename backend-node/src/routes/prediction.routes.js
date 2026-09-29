/**
 * Rutas relacionada con reconocimiento y deposito
 */
import { Router } from "express";
import { predecirResiduo  } from "../controllers/prediction.controller.js";
import { recibirImagen } from "../middlewares/upload.middleware.js";

const router = Router();

/**
 * Por ahora este endpoint solamente clasifica
 * 
 * En la siguiente etapa se agregara
 * - usaurio autenticado
 * - creación del deposito
 * - apertura de la puerta
 * - confirmación del ESP32
 * - asiganción de puntos
 */

router.post("/deposits/predict", recibirImagen, predecirResiduo);

export default router;