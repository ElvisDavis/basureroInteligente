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
export async function listarDepositosUsuario(userId) {
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

/**
 * Construye un error controlado del servicio
 */
function crearErrorDeposito(message, statusCode, code){
    const error = new Error(message);

    error.statusCode = statusCode;
    error.code = code;

    return error;
}

/**
 * Confirma físicamente un depósito y acredita sus puntos.
 *
 * Toda la operación ocurre dentro de una transacción:
 * - cambia el estado del depósito;
 * - crea el movimiento;
 * - incrementa el saldo.
 *
 * Si alguna operación falla, PostgreSQL revierte todo.
 */
export async function confirmarDeposito(
    depositId
) {
    /**
     * Reintentamos una transacción si PostgreSQL detecta
     * una modificación simultánea.
     */
    for (
        let intento = 1;
        intento <= 3;
        intento += 1
    ) {
        try {
            return await prisma.$transaction(
                async (transaction) => {
                    const deposito =
                        await transaction.deposit.findUnique({
                            where: {
                                id: depositId,
                            },
                            select: {
                                id: true,
                                userId: true,
                                wasteClass: true,
                                confidence: true,
                                points: true,
                                status: true,
                                confirmedAt: true,
                            },
                        });

                    if (!deposito) {
                        throw crearErrorDeposito(
                            "El depósito no existe.",
                            404,
                            "DEPOSIT_NOT_FOUND"
                        );
                    }

                    /**
                     * Una confirmación repetida no vuelve
                     * a sumar puntos.
                     */
                    if (
                        deposito.status ===
                        "CONFIRMED"
                    ) {
                        const usuario =
                            await transaction.user.findUnique({
                                where: {
                                    id: deposito.userId,
                                },
                                select: {
                                    points: true,
                                },
                            });

                        return {
                            deposit: deposito,
                            awardedPoints: 0,
                            userPoints:
                                usuario.points,
                            alreadyConfirmed: true,
                        };
                    }

                    if (
                        deposito.status !==
                        "PENDING"
                    ) {
                        throw crearErrorDeposito(
                            "El depósito no se encuentra pendiente.",
                            409,
                            "DEPOSIT_NOT_PENDING"
                        );
                    }

                    const regla =
                        obtenerReglaResiduo(
                            deposito.wasteClass
                        );

                    if (
                        !regla ||
                        !regla.recyclable
                    ) {
                        throw crearErrorDeposito(
                            "La clasificación no genera puntos.",
                            409,
                            "DEPOSIT_NOT_REWARDABLE"
                        );
                    }

                    const confirmedAt =
                        new Date();

                    const depositoActualizado =
                        await transaction.deposit.update({
                            where: {
                                id: deposito.id,
                            },
                            data: {
                                status: "CONFIRMED",
                                points: regla.points,
                                confirmedAt,
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

                    await transaction.pointMovement.create({
                        data: {
                            userId:
                                deposito.userId,
                            depositId:
                                deposito.id,
                            amount:
                                regla.points,
                            type: "EARNED",
                            description:
                                `Depósito confirmado: ${deposito.wasteClass}`,
                        },
                    });

                    const usuarioActualizado =
                        await transaction.user.update({
                            where: {
                                id: deposito.userId,
                            },
                            data: {
                                points: {
                                    increment:
                                        regla.points,
                                },
                            },
                            select: {
                                points: true,
                            },
                        });

                    return {
                        deposit:
                            depositoActualizado,
                        awardedPoints:
                            regla.points,
                        userPoints:
                            usuarioActualizado.points,
                        alreadyConfirmed: false,
                    };
                },
                {
                    /**
                     * Evita que dos confirmaciones simultáneas
                     * otorguen puntos duplicados.
                     */
                    isolationLevel:
                        "Serializable",
                }
            );
        } catch (error) {
            /**
             * P2034 indica conflicto o bloqueo entre
             * transacciones concurrentes.
             */
            if (
                error.code === "P2034" &&
                intento < 3
            ) {
                continue;
            }

            throw error;
        }
    }

    throw crearErrorDeposito(
        "No fue posible confirmar el depósito.",
        503,
        "DEPOSIT_CONFIRMATION_FAILED"
    );
}

/**
 * Marca un deposito pendiente como fallido
 * 
 * Se utiliza cuando no fue posible publicar la orden 
 * de apertura mediante MQTT
 */

export async function marcarDepositoFallido(depositId){
    return prisma.deposit.updateMany({
        where: {
            id: depositId,
            status:"PENDING",
        },
        data: {
            status: "FAILED",
        },
    });
}