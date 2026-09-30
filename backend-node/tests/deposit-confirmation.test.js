/**
 * Pruebas de confirmación física y acreditación de puntos.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
    after,
    before,
    describe,
    test,
} from "node:test";

import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { env } from "../src/config/env.js";

let usuario;
let depositoPendiente;
let depositoCancelado;

describe(
    "Confirmación física de depósitos",
    {
        concurrency: false,
    },
    () => {
        before(async () => {
            usuario = await prisma.user.create({
                data: {
                    name:
                        "Usuario Confirmación",
                    email:
                        `confirm-${randomUUID()}@prueba.com`,
                    passwordHash:
                        "hash-no-utilizado",
                },
            });

            depositoPendiente =
                await prisma.deposit.create({
                    data: {
                        userId: usuario.id,
                        predictionId:
                            randomUUID(),
                        wasteClass:
                            "plastic",
                        confidence:
                            0.95,
                        status:
                            "PENDING",
                    },
                });

            depositoCancelado =
                await prisma.deposit.create({
                    data: {
                        userId: usuario.id,
                        predictionId:
                            randomUUID(),
                        wasteClass:
                            "trash",
                        confidence:
                            0.99,
                        status:
                            "CANCELLED",
                    },
                });
        });

        after(async () => {
            await prisma.pointMovement.deleteMany({
                where: {
                    userId: usuario.id,
                },
            });

            await prisma.deposit.deleteMany({
                where: {
                    userId: usuario.id,
                },
            });

            await prisma.user.delete({
                where: {
                    id: usuario.id,
                },
            });
        });

        test(
            "rechaza confirmación sin clave",
            async () => {
                const respuesta =
                    await request(app)
                        .post(
                            `/api/v1/internal/deposits/${depositoPendiente.id}/confirm`
                        )
                        .expect(401);

                assert.equal(
                    respuesta.body.error.code,
                    "DEVICE_KEY_REQUIRED"
                );
            }
        );

        test(
            "rechaza una clave incorrecta",
            async () => {
                const respuesta =
                    await request(app)
                        .post(
                            `/api/v1/internal/deposits/${depositoPendiente.id}/confirm`
                        )
                        .set(
                            "x-device-key",
                            "clave-incorrecta"
                        )
                        .expect(403);

                assert.equal(
                    respuesta.body.error.code,
                    "INVALID_DEVICE_KEY"
                );
            }
        );

        test(
            "confirma depósito y acredita puntos",
            async () => {
                const respuesta =
                    await request(app)
                        .post(
                            `/api/v1/internal/deposits/${depositoPendiente.id}/confirm`
                        )
                        .set(
                            "x-device-key",
                            env.DEVICE_API_KEY
                        )
                        .expect(200);

                assert.equal(
                    respuesta.body.awardedPoints,
                    10
                );

                assert.equal(
                    respuesta.body.userPoints,
                    10
                );

                assert.equal(
                    respuesta.body.deposit.status,
                    "CONFIRMED"
                );

                assert.equal(
                    respuesta.body.alreadyConfirmed,
                    false
                );

                const movimientos =
                    await prisma.pointMovement.count({
                        where: {
                            depositId:
                                depositoPendiente.id,
                        },
                    });

                assert.equal(
                    movimientos,
                    1
                );
            }
        );

        test(
            "no duplica puntos al confirmar nuevamente",
            async () => {
                const respuesta =
                    await request(app)
                        .post(
                            `/api/v1/internal/deposits/${depositoPendiente.id}/confirm`
                        )
                        .set(
                            "x-device-key",
                            env.DEVICE_API_KEY
                        )
                        .expect(200);

                assert.equal(
                    respuesta.body.awardedPoints,
                    0
                );

                assert.equal(
                    respuesta.body.userPoints,
                    10
                );

                assert.equal(
                    respuesta.body.alreadyConfirmed,
                    true
                );

                const movimientos =
                    await prisma.pointMovement.count({
                        where: {
                            depositId:
                                depositoPendiente.id,
                        },
                    });

                assert.equal(
                    movimientos,
                    1
                );
            }
        );

        test(
            "no permite confirmar un depósito cancelado",
            async () => {
                const respuesta =
                    await request(app)
                        .post(
                            `/api/v1/internal/deposits/${depositoCancelado.id}/confirm`
                        )
                        .set(
                            "x-device-key",
                            env.DEVICE_API_KEY
                        )
                        .expect(409);

                assert.equal(
                    respuesta.body.error.code,
                    "DEPOSIT_NOT_PENDING"
                );
            }
        );
    }
);