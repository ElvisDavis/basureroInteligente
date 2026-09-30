/**
 * Lógica principal para iniciar y consultar depósitos.
 */

import { prisma } from "../config/database.js";
import {
    MINIMUM_CONFIDENCE,
    obtenerReglaResiduo,
} from "../config/waste.config.js";
import {
    clasificarImagen,
} from "./ai.service.js";

/**
 * Determina por qué un objeto no debe abrir una puerta.
 */
function obtenerMotivoRechazo({
    regla,
    confidence,
}) {
    if (!regla) {
        return "UNKNOWN_CLASS";
    }

    if (!regla.recyclable) {
        return "NOT_RECYCLABLE";
    }

    if (confidence < MINIMUM_CONFIDENCE) {
        return "LOW_CONFIDENCE";
    }

    return null;
}

/**
 * Clasifica la imagen y crea un depósito.
 *
 * IMPORTANTE:
 * - PENDING significa que esperamos confirmación del ESP32.
 * - CANCELLED significa que no debe abrirse una puerta.
 * - Todavía no se modifican los puntos del usuario.
 */
export async function iniciarDeposito({
    userId,
    file,
}) {
    const resultadoIA =
        await clasificarImagen(file);

    const wasteClass =
        resultadoIA.prediction.class;

    const confidence =
        resultadoIA.prediction.confidence;

    const regla =
        obtenerReglaResiduo(wasteClass);

    const rejectionReason =
        obtenerMotivoRechazo({
            regla,
            confidence,
        });

    const shouldOpen =
        rejectionReason === null;

    const estado =
        shouldOpen
            ? "PENDING"
            : "CANCELLED";

    /**
     * points permanece en cero.
     *
     * potentialPoints solamente informa cuántos puntos
     * se acreditarán cuando el ESP32 confirme la caída.
     */
    const potentialPoints =
        shouldOpen
            ? regla.points
            : 0;

    const deposito =
        await prisma.deposit.create({
            data: {
                userId,
                predictionId:
                    resultadoIA.prediction_id,
                wasteClass,
                confidence,
                points: 0,
                status: estado,
            },
            select: {
                id: true,
                predictionId: true,
                wasteClass: true,
                confidence: true,
                points: true,
                status: true,
                createdAt: true,
                confirmedAt: true,
            },
        });

    return {
        deposit: {
            ...deposito,
            potentialPoints,
        },

        prediction:
            resultadoIA.prediction,

        topPredictions:
            resultadoIA.top_predictions,

        model:
            resultadoIA.model,

        action: {
            shouldOpen,
            compartment:
                shouldOpen
                    ? regla.compartment
                    : null,
            rejectionReason,
            minimumConfidence:
                MINIMUM_CONFIDENCE,
        },
    };
}

/**
 * Obtiene los últimos depósitos del usuario autenticado.
 */
export async function listarDepositosUsuario(
    userId
) {
    return prisma.deposit.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 50,
        select: {
            id: true,
            predictionId: true,
            wasteClass: true,
            confidence: true,
            points: true,
            status: true,
            createdAt: true,
            confirmedAt: true,
        },
    });
}