/**
 * Pruebas de integración de autenticación.
 *
 * Estas pruebas utilizan PostgreSQL, crean un usuario temporal
 * y lo eliminan al finalizar.
 */

import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { after, describe, test } from "node:test";

import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { env } from "../src/config/env.js";

const correoPrueba = `test-${randomUUID()}@prueba.com`;
const codigoPrueba = "123456";

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
    after(async () => {
      await prisma.user.deleteMany({
        where: {
          email: correoPrueba,
        },
      });
    });

    test("registra un usuario pendiente de verificación", async () => {
      const respuesta = await request(app)
        .post("/api/v1/auth/register")
        .send(datosUsuario)
        .expect(201);

      assert.equal(respuesta.body.success, true);
      assert.equal(respuesta.body.user.email, correoPrueba);
      assert.equal(respuesta.body.user.points, 0);
      assert.equal(respuesta.body.user.isEmailVerified, false);
      assert.equal(respuesta.body.user.passwordHash, undefined);
      assert.equal(respuesta.body.verificationRequired, true);

      // Un usuario sin verificar todavía no debe recibir un JWT.
      assert.equal(respuesta.body.token, undefined);

      usuarioId = respuesta.body.user.id;
    });

    test("detecta una cuenta pendiente de verificación", async () => {
      const respuesta = await request(app)
        .post("/api/v1/auth/register")
        .send(datosUsuario)
        .expect(409);

      assert.equal(respuesta.body.error.code, "EMAIL_VERIFICATION_PENDING");
    });

    test("impide iniciar sesión antes de verificar el correo", async () => {
      const respuesta = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: correoPrueba,
          password: datosUsuario.password,
        })
        .expect(403);

      assert.equal(respuesta.body.error.code, "EMAIL_NOT_VERIFIED");
    });

    test("rechaza un código de verificación incorrecto", async () => {
      const respuesta = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({
          email: correoPrueba,
          code: "999999",
        })
        .expect(400);

      assert.equal(respuesta.body.error.code, "INVALID_VERIFICATION_CODE");
    });

    test("verifica el correo con un código válido", async () => {
      /*
       * Sustituimos el código aleatorio por uno conocido únicamente
       * dentro de la base de datos de prueba.
       */
      const hashCodigo = createHmac("sha256", env.JWT_SECRET)
        .update(`${correoPrueba}:${codigoPrueba}`)
        .digest("hex");

      await prisma.user.update({
        where: {
          email: correoPrueba,
        },
        data: {
          emailVerificationCodeHash: hashCodigo,
          emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const respuesta = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({
          email: correoPrueba,
          code: codigoPrueba,
        })
        .expect(200);

      assert.equal(respuesta.body.success, true);
      assert.equal(respuesta.body.alreadyVerified, false);
      assert.equal(respuesta.body.user.id, usuarioId);
      assert.equal(respuesta.body.user.isEmailVerified, true);
    });

    test("reconoce un correo que ya fue verificado", async () => {
      const respuesta = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({
          email: correoPrueba,
          code: codigoPrueba,
        })
        .expect(200);

      assert.equal(respuesta.body.success, true);
      assert.equal(respuesta.body.alreadyVerified, true);
      assert.equal(respuesta.body.user.isEmailVerified, true);
    });

    test("permite iniciar sesión después de verificar el correo", async () => {
      const respuesta = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: correoPrueba,
          password: datosUsuario.password,
        })
        .expect(200);

      assert.equal(respuesta.body.success, true);
      assert.equal(respuesta.body.user.id, usuarioId);
      assert.equal(respuesta.body.user.isEmailVerified, true);

      assert.match(respuesta.body.token, /^[\w-]+\.[\w-]+\.[\w-]+$/);

      token = respuesta.body.token;
    });

    test("rechaza una contraseña incorrecta", async () => {
      const respuesta = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: correoPrueba,
          password: "Incorrecta123",
        })
        .expect(401);

      assert.equal(respuesta.body.error.code, "INVALID_CREDENTIALS");
    });

    test("rechaza el perfil sin token", async () => {
      const respuesta = await request(app).get("/api/v1/auth/me").expect(401);

      assert.equal(respuesta.body.error.code, "AUTH_TOKEN_REQUIRED");
    });

    test("devuelve el perfil con token válido", async () => {
      const respuesta = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      assert.equal(respuesta.body.success, true);
      assert.equal(respuesta.body.user.id, usuarioId);
      assert.equal(respuesta.body.user.email, correoPrueba);
      assert.equal(respuesta.body.user.isEmailVerified, true);
      assert.equal(respuesta.body.user.passwordHash, undefined);
    });
  },
);
