import { success } from "zod";

/**
 * Middleware ejecutado cuando ninguna rut coincide
 * con la soliciutd recibida
 */
export function rutaNoEncontrada(request, response){
    return response.status(404).json({
        success: false,
        error:{
            code: "ROUTE_NOT_FOUND",
            message: "La ruta solicitada no existe,",
            method: request.method,
            path: request.originalUrl,
        },
        timestamp: new Date().toISOString(),
    });
}