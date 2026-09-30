/**
 * Controladores para clasificación y depósitos.
 */

import {
    iniciarDeposito,
    listarDepositosUsuario,
} from "../services/deposit.service.js";

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