import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import mqtt from "mqtt";

const MQTT_URL =
    process.env.MQTT_URL ??
    "mqtt://127.0.0.1:1883";

const DEVICE_ID =
    process.env.MQTT_DEVICE_ID ??
    "bin-01";

const TOPICS = Object.freeze({
    openCommand:
        `smartbin/${DEVICE_ID}/commands/open`,

    depositConfirmed:
        `smartbin/${DEVICE_ID}/events/deposit-confirmed`,
});

function crearCliente() {
    return mqtt.connect(
        MQTT_URL,
        {
            clientId:
                `simulator-test-${randomUUID()}`,

            clean: true,
            reconnectPeriod: 0,
            connectTimeout: 3000,
        }
    );
}

function esperarConexion(cliente) {
    return new Promise(
        (resolve, reject) => {
            const temporizador =
                setTimeout(
                    () => {
                        reject(
                            new Error(
                                "Tiempo de conexión MQTT agotado."
                            )
                        );
                    },
                    4000
                );

            cliente.once(
                "connect",
                () => {
                    clearTimeout(
                        temporizador
                    );

                    resolve();
                }
            );

            cliente.once(
                "error",
                (error) => {
                    clearTimeout(
                        temporizador
                    );

                    reject(error);
                }
            );
        }
    );
}

function suscribirse(
    cliente,
    topic
) {
    return new Promise(
        (resolve, reject) => {
            cliente.subscribe(
                topic,
                {
                    qos: 1,
                },
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                }
            );
        }
    );
}

function publicar(
    cliente,
    topic,
    contenido
) {
    return new Promise(
        (resolve, reject) => {
            cliente.publish(
                topic,
                JSON.stringify(contenido),
                {
                    qos: 1,
                    retain: false,
                },
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                }
            );
        }
    );
}

function esperarConfirmacion(
    cliente,
    depositId,
    timeoutMs
) {
    return new Promise(
        (resolve, reject) => {
            const manejarMensaje = (
                topic,
                mensaje
            ) => {
                if (
                    topic !==
                    TOPICS.depositConfirmed
                ) {
                    return;
                }

                let contenido;

                try {
                    contenido = JSON.parse(
                        mensaje.toString(
                            "utf8"
                        )
                    );
                } catch {
                    return;
                }

                if (
                    contenido.depositId !==
                    depositId
                ) {
                    return;
                }

                limpiar();
                resolve(contenido);
            };

            const limpiar = () => {
                clearTimeout(
                    temporizador
                );

                cliente.off(
                    "message",
                    manejarMensaje
                );
            };

            const temporizador =
                setTimeout(
                    () => {
                        limpiar();

                        reject(
                            new Error(
                                "No se recibió la confirmación esperada."
                            )
                        );
                    },
                    timeoutMs
                );

            cliente.on(
                "message",
                manejarMensaje
            );
        }
    );
}

function cerrarCliente(cliente) {
    return new Promise(
        (resolve) => {
            cliente.end(
                true,
                {},
                resolve
            );
        }
    );
}

test(
    "confirma una orden OPEN válida",
    {
        timeout: 10000,
    },
    async () => {
        const cliente =
            crearCliente();

        try {
            await esperarConexion(
                cliente
            );

            await suscribirse(
                cliente,
                TOPICS.depositConfirmed
            );

            const depositId =
                randomUUID();

            const confirmacionPendiente =
                esperarConfirmacion(
                    cliente,
                    depositId,
                    7000
                );

            await publicar(
                cliente,
                TOPICS.openCommand,
                {
                    depositId,
                    compartment:
                        "plastic",
                    command: "OPEN",
                    timestamp:
                        new Date()
                            .toISOString(),
                }
            );

            const confirmacion =
                await confirmacionPendiente;

            assert.equal(
                confirmacion.depositId,
                depositId
            );

            assert.equal(
                confirmacion.deviceId,
                DEVICE_ID
            );

            assert.equal(
                confirmacion.compartment,
                "plastic"
            );

            assert.equal(
                confirmacion.sensor,
                "SIMULATED"
            );
        } finally {
            await cerrarCliente(
                cliente
            );
        }
    }
);

test(
    "rechaza una orden con comando inválido",
    {
        timeout: 6000,
    },
    async () => {
        const cliente =
            crearCliente();

        try {
            await esperarConexion(
                cliente
            );

            await suscribirse(
                cliente,
                TOPICS.depositConfirmed
            );

            const depositId =
                randomUUID();

            const confirmacionPendiente =
                esperarConfirmacion(
                    cliente,
                    depositId,
                    1500
                );

            await publicar(
                cliente,
                TOPICS.openCommand,
                {
                    depositId,
                    compartment:
                        "plastic",
                    command: "INVALID",
                    timestamp:
                        new Date()
                            .toISOString(),
                }
            );

            await assert.rejects(
                confirmacionPendiente,
                /No se recibió la confirmación/
            );
        } finally {
            await cerrarCliente(
                cliente
            );
        }
    }
);