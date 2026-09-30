/**
 * Pruebas del flujo autenticado de clasificación.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
    after,
    afterEach,
    before,
    test,
} from "node:test";

import jwt from "jsonwebtoken";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { env } from "../src/config/env.js";

const fetchOriginal = globalThis.fetch;

const emailPrueba =
    `prediction-${randomUUID()}@prueba.com`;

let usuario;
let token;

function crearRespuestaIA() {
    return {
        success: true,
        prediction_id: randomUUID(),
        prediction: {
            class: "plastic",
            confidence: 0.954751,
            confidence_percent: 95.48,
        },
        top_predictions: [
            {
                class: "plastic",
                confidence: 0.954751,
            },
            {
                class: "glass",
                confidence: 0.044691,
            },
            {
                class: "metal",
                confidence: 0.00041,
            },
        ],
        model: {
            name: "EfficientNetB0",
            version: "1.0",
            class_count: 6,
            classes: [
                "cardboard",
                "glass",
                "metal",
                "paper",
                "plastic",
                "trash",
            ],
        },
        timestamp:
            new Date().toISOString(),
    };
}

before(async () => {
    /**
     * El passwordHash no se usa en estas pruebas porque
     * generamos el JWT directamente.
     */
    usuario = await prisma.user.create({
        data: {
            name: "Usuario Predicciones",
            email: emailPrueba,
            passwordHash:
                "hash-no-utilizado-en-esta-prueba",
        },
    });

    token = jwt.sign(
        {
            email: usuario.email,
        },
        env.JWT_SECRET,
        {
            subject: usuario.id,
            expiresIn: "1h",
            issuer: "reciclaje-backend",
            audience: "reciclaje-flutter",
        }
    );
});

afterEach(() => {
    globalThis.fetch = fetchOriginal;
});

after(async () => {
    /**
     * El orden respeta las relaciones de PostgreSQL.
     */
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
    "rechaza una predicción sin autenticación",
    async () => {
        const respuesta = await request(app)
            .post("/api/v1/deposits/predict")
            .expect(401);

        assert.equal(
            respuesta.body.error.code,
            "AUTH_TOKEN_REQUIRED"
        );
    }
);

test(
    "clasifica y crea un depósito pendiente",
    async () => {
        globalThis.fetch = async () =>
            new Response(
                JSON.stringify(
                    crearRespuestaIA()
                ),
                {
                    status: 200,
                    headers: {
                        "content-type":
                            "application/json",
                    },
                }
            );

        const respuesta = await request(app)
            .post("/api/v1/deposits/predict")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .attach(
                "image",
                Buffer.from([
                    0xff,
                    0xd8,
                    0xff,
                    0xd9,
                ]),
                {
                    filename: "plastico.jpg",
                    contentType: "image/jpeg",
                }
            )
            .expect(201);

        assert.equal(
            respuesta.body.success,
            true
        );

        assert.equal(
            respuesta.body.prediction.class,
            "plastic"
        );

        assert.equal(
            respuesta.body.deposit.status,
            "PENDING"
        );

        assert.equal(
            respuesta.body.deposit.points,
            0
        );

        assert.equal(
            respuesta.body.deposit.potentialPoints,
            10
        );

        assert.equal(
            respuesta.body.action.shouldOpen,
            true
        );

        assert.equal(
            respuesta.body.action.compartment,
            "plastic"
        );
    }
);

test(
    "consulta el historial autenticado",
    async () => {
        const respuesta = await request(app)
            .get("/api/v1/deposits")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .expect(200);

        assert.equal(
            respuesta.body.success,
            true
        );

        assert.ok(
            respuesta.body.count >= 1
        );

        assert.equal(
            respuesta.body.deposits[0].wasteClass,
            "plastic"
        );
    }
);

test(
    "rechaza una solicitud sin imagen",
    async () => {
        const respuesta = await request(app)
            .post("/api/v1/deposits/predict")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .expect(400);

        assert.equal(
            respuesta.body.error.code,
            "IMAGE_REQUIRED"
        );
    }
);

test(
    "rechaza un archivo que no sea imagen",
    async () => {
        const respuesta = await request(app)
            .post("/api/v1/deposits/predict")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .attach(
                "image",
                Buffer.from("archivo"),
                {
                    filename: "archivo.txt",
                    contentType: "text/plain",
                }
            )
            .expect(415);

        assert.equal(
            respuesta.body.error.code,
            "UNSUPPORTED_IMAGE_TYPE"
        );
    }
);

test(
    "rechaza una imagen superior a 10 MB",
    async () => {
        const respuesta = await request(app)
            .post("/api/v1/deposits/predict")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .attach(
                "image",
                Buffer.alloc(
                    10 * 1024 * 1024 + 1
                ),
                {
                    filename: "grande.jpg",
                    contentType: "image/jpeg",
                }
            )
            .expect(413);

        assert.equal(
            respuesta.body.error.code,
            "IMAGE_TOO_LARGE"
        );
    }
);

test(
    "devuelve 503 cuando FastAPI no está disponible",
    async () => {
        globalThis.fetch = async () => {
            throw new TypeError("fetch failed");
        };

        const respuesta = await request(app)
            .post("/api/v1/deposits/predict")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .attach(
                "image",
                Buffer.from([
                    0xff,
                    0xd8,
                    0xff,
                    0xd9,
                ]),
                {
                    filename: "plastico.jpg",
                    contentType: "image/jpeg",
                }
            )
            .expect(503);

        assert.equal(
            respuesta.body.error.code,
            "AI_API_UNAVAILABLE"
        );
    }
);