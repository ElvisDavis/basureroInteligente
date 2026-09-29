/**
 * Pruebas automatizadas para la base del backend Node.js.
 */

import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import app from "../src/app.js";


test(
  "GET / responde con información del servicio",
  async () => {
    const respuesta = await request(app)
      .get("/")
      .expect(200);

    assert.equal(
      respuesta.body.success,
      true
    );

    assert.equal(
      respuesta.body.version,
      "1.0.0"
    );
  }
);


test(
  "GET /api/v1/health informa que el backend funciona",
  async () => {
    const respuesta = await request(app)
      .get("/api/v1/health")
      .expect(200);

    assert.equal(
      respuesta.body.success,
      true
    );

    assert.equal(
      respuesta.body.status,
      "ok"
    );

    assert.equal(
      respuesta.body.service,
      "backend-principal"
    );

    assert.equal(
      typeof respuesta.body.uptime_seconds,
      "number"
    );
  }
);


test(
  "una ruta inexistente devuelve un error 404 estructurado",
  async () => {
    const respuesta = await request(app)
      .get("/api/v1/ruta-inexistente")
      .expect(404);

    assert.equal(
      respuesta.body.success,
      false
    );

    assert.equal(
      respuesta.body.error.code,
      "ROUTE_NOT_FOUND"
    );
  }
);