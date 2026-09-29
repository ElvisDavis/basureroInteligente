/**
 * Rutas para cmprobar el estado del backend
 */
import { Router } from "express";
import { obtenerEstado } from "../controllers/health.controller.js";

const router = Router();

/**
 * GET /api/v1/health
 * 
 * Devuelve 200 cuando el backend está funcionando 
 */
router.get("/health", obtenerEstado);

export default router;