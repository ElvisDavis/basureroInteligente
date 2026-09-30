/**
 * Controladores para clasificación y depósitos.
 */

import {
    iniciarDeposito,
    listarDepositosUsuario,
    marcarDepositoFallido,
} from "../services/deposit.service.js";

import {publicarApertura} from "../services/mqtt.service.js";



/**
 * Clasifica una imagen y crea un depósito pendiente.
 */
export async function predecirResiduo(
    request,
    response,
    next
) {
    try {
        if (!request.file) {
            const error = new Error(
                "Debe enviar una imagen utilizando el campo image."
            );

            error.statusCode = 400;
            error.code = "IMAGE_REQUIRED";

            throw error;
        }

        if (request.file.buffer.length === 0) {
            const error = new Error(
                "La imagen enviada está vacía."
            );

            error.statusCode = 400;
            error.code = "EMPTY_IMAGE";

            throw error;
        }

        const resultado =
            await iniciarDeposito({
                userId: request.user.id,
                file: request.file,
            });
            /**
             * Solamente publicamos una orden cuando:
             * - la clase es reciclable
             * - la confianza supera el mínimo
             * - el depósito quedo pendiente
             */
            let commandPublished = false;

            if (resultado.action.shouldOpen){
                try{
                    await publicarApertura({
                        depositId: resultado.deposit.id,
                        compartment: resultado.action.compartment,
                    });
                    commandPublished = true;
                }catch(error){
                    /**
                     * No dejamos un deposito pendiente si nunca fue
                     * posible enviar la orden de apertura
                     */
                    await marcarDepositoFallido(resultado.deposit.id);
                    throw error;
                }
            }

        return response.status(201).json({
            success: true,

            deposit:
                resultado.deposit,

            prediction:
                resultado.prediction,

            top_predictions:
                resultado.topPredictions,

            model:
                resultado.model,

            action:
                resultado.action,

            mqtt: {
                commandPublished,
            },

            timestamp:
                new Date().toISOString(),
        });
    } catch (error) {
        return next(error);
    }
}

/**
 * Historial de depósitos del usuario autenticado.
 */
export async function obtenerDepositos(
    request,
    response,
    next
) {
    try {
        const deposits =
            await listarDepositosUsuario(
                request.user.id
            );

        return response.status(200).json({
            success: true,
            deposits,
            count: deposits.length,
            timestamp:
                new Date().toISOString(),
        });
    } catch (error) {
        return next(error);
    }
}