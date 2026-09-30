/**
 * Pruebas de integración de autenticación.
 *
 * Estas pruebas utilizan PostgreSQL, crean un usuario temporal
 * y lo eliminan al finalizar.
 */

import assert from "node:assert/strict";
import {
    after,
    describe,
    test,
} from "node:test";
import { randomUUID } from "node:crypto";

import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/config/database.js";

/**
 * El correo cambia en cada ejecución para evitar conflictos.
 */
const correoPrueba =
    `test-${randomUUID()}@prueba.com`;

const datosUsuario = {
    name: "Usuario Automatizado",
    email: correoPrueba,
    password: "Prueba123",
};

let token;
let usuarioId;

describe(
    "Autenticación de usuarios",
    {
        concurrency: false,
    },
    () => {
        /**
         * Eliminamos el usuario temporal aunque alguna prueba falle.
         */
        after(async () => {
            await prisma.user.deleteMany({
                where: {
                    email: correoPrueba,
                },
            });
        });

        test(
            "registra un usuario nuevo",
            async () => {
                const respuesta = await request(app)
                    .post("/api/v1/auth/register")
                    .send(datosUsuario)
                    .expect(201);

                assert.equal(
                    respuesta.body.success,
                    true
                );

                assert.equal(
                    respuesta.body.user.email,
                    correoPrueba
                );

                assert.equal(
                    respuesta.body.user.points,
                    0
                );

                assert.equal(
                    respuesta.body.user.passwordHash,
                    undefined
                );

                assert.match(
                    respuesta.body.token,
                    /^[\w-]+\.[\w-]+\.[\w-]+$/
                );

                token = respuesta.body.token;
                usuarioId =
                    respuesta.body.user.id;
            }
        );

        test(
            "rechaza un correo ya registrado",
            async () => {
                const respuesta = await request(app)
                    .post("/api/v1/auth/register")
                    .send(datosUsuario)
                    .expect(409);

                assert.equal(
                    respuesta.body.error.code,
                    "EMAIL_ALREADY_REGISTERED"
                );
            }
        );

        test(
            "permite iniciar sesión",
            async () => {
                const respuesta = await request(app)
                    .post("/api/v1/auth/login")
                    .send({
                        email: correoPrueba,
                        password:
                            datosUsuario.password,
                    })
                    .expect(200);

                assert.equal(
                    respuesta.body.success,
                    true
                );

                assert.equal(
                    respuesta.body.user.id,
                    usuarioId
                );

                token = respuesta.body.token;
            }
        );

        test(
            "rechaza una contraseña incorrecta",
            async () => {
                const respuesta = await request(app)
                    .post("/api/v1/auth/login")
                    .send({
                        email: correoPrueba,
                        password:
                            "Incorrecta123",
                    })
                    .expect(401);

                assert.equal(
                    respuesta.body.error.code,
                    "INVALID_CREDENTIALS"
                );
            }
        );

        test(
            "rechaza el perfil sin token",
            async () => {
                const respuesta = await request(app)
                    .get("/api/v1/auth/me")
                    .expect(401);

                assert.equal(
                    respuesta.body.error.code,
                    "AUTH_TOKEN_REQUIRED"
                );
            }
        );

        test(
            "devuelve el perfil con token válido",
            async () => {
                const respuesta = await request(app)
                    .get("/api/v1/auth/me")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .expect(200);

                assert.equal(
                    respuesta.body.success,
                    true
                );

                assert.equal(
                    respuesta.body.user.id,
                    usuarioId
                );

                assert.equal(
                    respuesta.body.user.email,
                    correoPrueba
                );

                assert.equal(
                    respuesta.body.user.passwordHash,
                    undefined
                );
            }
        );
    }
);