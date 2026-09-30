/**
 * Controladores utilizados por dispositivos autorizados.
 */

import {
    confirmarDeposito,
} from "../services/deposit.service.js";

export async function confirmarDepositoFisico(
    request,
    response,
    next
) {
    try {
        const resultado =
            await confirmarDeposito(
                request.params.depositId
            );

        return response.status(200).json({
            success: true,
            message:
                resultado.alreadyConfirmed
                    ? "El depósito ya había sido confirmado."
                    : "Depósito confirmado y puntos acreditados.",
            ...resultado,
            timestamp:
                new Date().toISOString(),
        });
    } catch (error) {
        return next(error);
    }
}