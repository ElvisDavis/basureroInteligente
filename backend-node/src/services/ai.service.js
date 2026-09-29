/**
 * Servicio encargado de comunicarse con la API de la inteligencia artificial
 * 
 * El resto del backend no debe utilizar fetch directamente para llamar
 * a FastAPI. Toda esa comunicación centralizada aquí
 */

import { z } from "zod";

import { env } from "../config/env.js";

/**
 * Valida que FastAPI entregue el contrato esperado
 * 
 * Esto evita que una respuest aincompleta o modificada llegue
 * sileciosamente a Flutter
 */

const esquemaRespuestaIA = z.object({
    success: z.boolean(),

    prediction_id: z.string().uuid(),

    prediction: z.object({
        class: z.string().min(1),
        confidence: z.number().min(0).max(1),
        confidence_percent: z.number().min(0).max(100),
    }),

    top_predictions: z.array(
        z.object({
            class: z.string().min(1),
            confidence: z.number().min(0).max(1),
        })
    ),

    model: z.object({
        name: z.string().min(1),
        version: z.string().min(1),
        class_count: z.number().int().positive(),
        classes: z.array(z.string()),
    }),
    timestamp: z.string().min(1),

});

/**
 * Error controlado utilizado cuando falla el microservicio se IA
 */

export class ErrorServicioIA extends Error {
    constructor({ message, statusCode, code, details = undefined, }) {
        super(message);

        this.name = "ErrorServicioIA";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

/**
 * Convierte texto JSON de forma segura
 */

function convertirRespuestaJson(texto) {
    try {
        return JSON.parse(texto);
    } catch {
        return null;
    }
}

/**
 * Envia una imagena fastAPI y devuelve la clasificación valida 
 */

export async function clasificarImagen(archivo) {
    const formulario = new FormData();

    /**
     * Node.js 22 incluye Blob y FormData de forma nativa
     */
    const imagen = new Blob([archivo.buffer], {
        type: archivo.mimetype,
    });

    /**
     * El nombre image debe coinciddir con el parámetro definido
     * en el endpoint de FastAPI
     */
    formulario.append(
        "image",
        imagen,
        archivo.originalname
    );

    const controlador = new AbortController();
    const temporizador = setTimeout(() => {
        controlador.abort();
    }, env.AI_API_TIMEOUT_MS);

    try{
        const respuesta = await fetch(
            `${env.AI_API_URL}/api/v1/predict`,
            {
                method : "POST",
                body: formulario,
                signal: controlador.signal,
            }
        );

        const textoRespuesta = await respuesta.text();
        const contenido = convertirRespuestaJson(textoRespuesta);

        /**
         * Conservamos ¿errores 4xx de FAstAPI porque normalmente
         * significan que la imagen está vacia o corrupta
         * 
         * Los errores internos de FastAPI se convierte en 502
         */
        if (!respuesta.ok){
            const codigoHttp = respuesta.status >= 400 && respuesta.status < 500 ? respuesta.status :502;

            throw new ErrorServicioIA({
                message: "La API de inteligencia artificial rechazó la imagen",
                statusCode: codigoHttp,
                code: "AI_API_REJECTED_REQUEST",
                details: contenido?.detail,
            });
        }
        const validacion = esquemaRespuestaIA.safeParse(contenido);

        if (!validacion.success){
            throw new ErrorServicioIA({
                message: "La API de inteligencia de artificial devolvió una respuesta invalida",
                statusCode: 502,
                code: "INVALID_AI_RESPONSE",
            });
        }
        return validacion.data;
    } catch (error){
        /**
         * Conservamos los errores que nosotros mismo generamos
         */
        if (error instanceof ErrorServicioIA){
            throw error;
        }
        /**
         * AbortError significa que FastAPI tard´+o mpas que el 
         * tiempo configurado
         */
        if (error.name === "AbortError"){
            throw new ErrorServicioIA({
                message: "La API de inteligencia artificial tradó demasiado en responder",
                statusCode:504,
                code:"AI_API_TIMEOUT",
            });
        }
        /**
         * Normalmente indica que FastAPI eatá apagado o que existe
         * un problema de red
         */
        throw new ErrorServicioIA({
            message: "No fue posible conectar con la API de inteligencia artificial",
            statusCode: 503,
            code: "AI_API_UNAVAILABLE",
        });
    }finally{
        clearTimeout(temporizador);
    }

}