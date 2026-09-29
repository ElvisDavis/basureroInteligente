/**
 * Pruebas automatizadas del endpoint de clasificación.
 *
 * FastAPI se simula reemplazando temporalmente globalThis.fetch.
 * Así las pruebas son rápidas y no requieren iniciar Python.
 */

import assert from "node:assert/strict";
import {
    afterEach,
    test,
} from "node:test";

import request from "supertest";

import app from "../src/app.js";

/**
 * Conservamos fetch para restaurarlo después de cada prueba.
 */
const fetchOriginal = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = fetchOriginal;
});

/**
 * Respuesta válida simulada de FastAPI.
 */
function crearRespuestaIA() {
    return {
        success: true,
        prediction_id:
            "15ba9a9c-c58b-4e25-b2d5-a1ed3f12c901",
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
            "2026-09-29T22:40:57.223Z",
    };
}

test(
    "POST /deposits/predict clasifica una imagen",
    async () => {
        /**
         * Simulamos una respuesta HTTP correcta de FastAPI.
         */
        globalThis.fetch = async (
            url,
            options
        ) => {
            assert.equal(
                url,
                "http://127.0.0.1:8000/api/v1/predict"
            );

            assert.equal(
                options.method,
                "POST"
            );

            assert.ok(
                options.body instanceof FormData
            );

            return new Response(
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
        };

        const respuesta = await request(app)
            .post(
                "/api/v1/deposits/predict"
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
            .expect(200);

        assert.equal(
            respuesta.body.success,
            true
        );

        assert.equal(
            respuesta.body.prediction.class,
            "plastic"
        );

        assert.equal(
            respuesta.body.prediction_id,
            crearRespuestaIA().prediction_id
        );

        assert.equal(
            respuesta.body.top_predictions.length,
            3
        );

        assert.match(
            respuesta.body.request_id,
            /^[0-9a-f-]{36}$/i
        );
    }
);

test(
    "rechaza una solicitud sin imagen",
    async () => {
        const respuesta = await request(app)
            .post(
                "/api/v1/deposits/predict"
            )
            .expect(400);

        assert.equal(
            respuesta.body.success,
            false
        );

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
            .post(
                "/api/v1/deposits/predict"
            )
            .attach(
                "image",
                Buffer.from("archivo de prueba"),
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
        const imagenGrande = Buffer.alloc(
            10 * 1024 * 1024 + 1
        );

        const respuesta = await request(app)
            .post(
                "/api/v1/deposits/predict"
            )
            .attach(
                "image",
                imagenGrande,
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
            throw new TypeError(
                "fetch failed"
            );
        };

        const respuesta = await request(app)
            .post(
                "/api/v1/deposits/predict"
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
            respuesta.body.success,
            false
        );

        assert.equal(
            respuesta.body.error.code,
            "AI_API_UNAVAILABLE"
        );
    }
);