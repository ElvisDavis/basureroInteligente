/**
 * Controladores relacionados con el estado del backend
 */
import { env } from "../config/env.js";

/**
 * Responde con el estado básico del servicio 
 * 
 * Este endpoint permitirá que Flutter, Docker p un sistema de 
 * monitoreo comprueben que Node.js está disponible
 */
export function obtenerEstado(_request, response){
    return response.status(200).json({
        success: true,
        service: "backend-principal",
        status: "ok",
        environment: env.NODE_ENV,

        //tiempo que el proceso lleva activo, expresado en segundos
        uptime_seconds: Math.floor(process.uptime()),

        //Se utiliza formato ISO 8601  para evitar ambiguedad
        //entre zonas horarias
        timestamp: new Date().toISOString(),
    });
}