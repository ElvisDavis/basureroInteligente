/**
 * Protege las rutas internas utilizadas por la ESP32.
 */

import {
    timingSafeEqual,
} from "node:crypto";

import { env } from "../config/env.js";

/**
 * Compara dos claves evitando comparaciones vulnerables
 * a ataques basados en tiempo.
 */
function clavesIguales(claveRecibida, claveEsperada) {
    const recibida = Buffer.from(
        claveRecibida
    );

    const esperada = Buffer.from(
        claveEsperada
    );

    if (
        recibida.length !== esperada.length
    ) {
        return false;
    }

    return timingSafeEqual(
        recibida,
        esperada
    );
}

export function autenticarDispositivo(request, _response,next) {
    const clave =
        request.headers["x-device-key"];

    if (
        typeof clave !== "string" ||
        clave.length === 0
    ) {
        const error = new Error(
            "Debe proporcionar la clave del dispositivo."
        );

        error.statusCode = 401;
        error.code = "DEVICE_KEY_REQUIRED";

        return next(error);
    }

    if (
        !clavesIguales(
            clave,
            env.DEVICE_API_KEY
        )
    ) {
        const error = new Error(
            "La clave del dispositivo es inválida."
        );

        error.statusCode = 403;
        error.code = "INVALID_DEVICE_KEY";

        return next(error);
    }

    return next();
}