/**
 * Controlador para solicitar clasificaciones de residuos
 */
import { randomUUID } from "node:crypto";
import { clasificarImagen } from "../services/ai.service.js";

/**
 * Recibe la imagen, solicita la clasificación a FastAPI
 * y devuelve una respuesta uniforme al cliente
 */
export async function predecirResiduo(request, response, next) {
    try{
        /**
         * Multer deja el archivo procesado en request.file
         */
        if(!request.file){
            const error = new Error("Debe enviar una imagen utilizando el campo image.");

            error.statusCode = 400;
            error.code = "IMAGE_REQUIRED";
            throw error;
        }

        if (request.file.buffer.length === 0){
            const error = new Error("La imagen enviada esta vacia");
            error.statusCode = 400;
            error.code = "EMPTY_IMAGE";
            throw error;
        }

        const resultadoIA = await clasificarImagen(request.file);

        return response.status(200).json({
            success:true,

            /**
             * Identifica la solicitud realizada al backend Node.js
             * Es diferente del prediction_id generado por FastAPI
             */
            request_id: randomUUID(),

            prediction_id: resultadoIA.prediction_id,
            prediction: resultadoIA.prediction,
            top_predictions: resultadoIA.top_predictions,
            model: resultadoIA.model,
            timestamp: new Date().toISOString(),
        });
    }catch (error){
        return next(error);
    }
}