/**
 * Comunicación MQTT entre Node.js y la ESP32.
 */

import mqtt from "mqtt";

import { env } from "../config/env.js";
import {
    confirmarDeposito,
} from "./deposit.service.js";

let clienteMqtt = null;
let conectado = false;

/**
 * Los tópicos incluyen el identificador del basurero.
 * Esto permitirá controlar varios dispositivos posteriormente.
 */
const TOPICS = Object.freeze({
    openCommand:
        `smartbin/${env.MQTT_DEVICE_ID}/commands/open`,

    depositConfirmed:
        `smartbin/${env.MQTT_DEVICE_ID}/events/deposit-confirmed`,

    status:
        `smartbin/${env.MQTT_DEVICE_ID}/status`,
});

/**
 * Procesa una confirmación publicada por la ESP32.
 */
async function procesarConfirmacion(
    mensaje
) {
    let contenido;

    try {
        contenido = JSON.parse(
            mensaje.toString("utf8")
        );
    } catch {
        console.error(
            "MQTT: confirmación con JSON inválido."
        );

        return;
    }

    if (
        typeof contenido.depositId !==
        "string"
    ) {
        console.error(
            "MQTT: la confirmación no contiene depositId."
        );

        return;
    }

    try {
        const resultado =
            await confirmarDeposito(
                contenido.depositId
            );

        console.log(
            "MQTT: depósito confirmado:",
            {
                depositId:
                    contenido.depositId,
                awardedPoints:
                    resultado.awardedPoints,
                alreadyConfirmed:
                    resultado.alreadyConfirmed,
            }
        );
    } catch (error) {
        console.error(
            "MQTT: no fue posible confirmar el depósito:",
            {
                depositId:
                    contenido.depositId,
                code: error.code,
                message: error.message,
            }
        );
    }
}

/**
 * Inicia la conexión con Mosquitto.
 *
 * Si el broker está apagado, el cliente continuará intentando
 * reconectarse sin detener la API HTTP.
 */
export function iniciarMqtt() {
    if (clienteMqtt) {
        return clienteMqtt;
    }

    clienteMqtt = mqtt.connect(
        env.MQTT_URL,
        {
            /**
             * Process.pid hace único al cliente
             * 
             * Así el backend y las pruebas pueden conectarse simultaneamente
             * sin que mosquito desconexte a uno de ellos
             * 
             */
            clientId: `backend-${env.MQTT_DEVICE_ID}-${process.pid}`,
            clean: true,
            reconnectPeriod: 2000,
            connectTimeout: 5000,
        }
    );

    clienteMqtt.on(
        "connect",
        () => {
            conectado = true;

            console.log(
                `MQTT conectado: ${env.MQTT_URL}`
            );

            clienteMqtt.subscribe(
                TOPICS.depositConfirmed,
                {
                    qos: 1,
                },
                (error) => {
                    if (error) {
                        console.error(
                            "MQTT: error al suscribirse:",
                            error.message
                        );

                        return;
                    }

                    console.log(
                        `MQTT suscrito: ${TOPICS.depositConfirmed}`
                    );
                }
            );
        }
    );

    clienteMqtt.on(
        "reconnect",
        () => {
            console.log(
                "MQTT: intentando reconectar..."
            );
        }
    );

    clienteMqtt.on(
        "offline",
        () => {
            conectado = false;

            console.warn(
                "MQTT: broker desconectado."
            );
        }
    );

    clienteMqtt.on(
        "error",
        (error) => {
            conectado = false;

            console.error(
                "MQTT: error de conexión:",
                error.message
            );
        }
    );

    clienteMqtt.on(
        "message",
        (topic, mensaje) => {
            if (
                topic ===
                TOPICS.depositConfirmed
            ) {
                void procesarConfirmacion(
                    mensaje
                );
            }
        }
    );

    return clienteMqtt;
}

/**
 * Publica una orden para abrir un compartimento.
 */
export function publicarApertura({
    depositId,
    compartment,
}) {
    return new Promise(
        (resolve, reject) => {
            if (
                !clienteMqtt ||
                !conectado
            ) {
                const error = new Error(
                    "El broker MQTT no está disponible."
                );

                error.statusCode = 503;
                error.code =
                    "MQTT_UNAVAILABLE";

                reject(error);
                return;
            }

            const mensaje = JSON.stringify({
                depositId,
                compartment,
                command: "OPEN",
                timestamp:
                    new Date().toISOString(),
            });

            clienteMqtt.publish(
                TOPICS.openCommand,
                mensaje,
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

/**
 * Informa el estado actual de la conexión.
 */
export function obtenerEstadoMqtt() {
    return {
        connected: conectado,
        broker: env.MQTT_URL,
        deviceId:
            env.MQTT_DEVICE_ID,
        topics: TOPICS,
    };
}

/**
 * Espera hasta que la conexion MQTT este disponiblew
 * 
 * Se utiliza en pruebas y en procesos que necesitan confirmar
 * que el broker está conectado antes de publicar
 */
export function esperarConexionMqtt(
    timeoutMs = 5000
) {
    if (conectado) {
        return Promise.resolve();
    }

    const cliente = iniciarMqtt();

    return new Promise(
        (resolve, reject) => {
            const limpiar = () => {
                clearTimeout(temporizador);

                cliente.off(
                    "connect",
                    manejarConexion
                );

                cliente.off(
                    "error",
                    manejarError
                );
            };

            const manejarConexion = () => {
                limpiar();
                resolve();
            };

            const manejarError = (error) => {
                limpiar();
                reject(error);
            };

            const temporizador =
                setTimeout(() => {
                    limpiar();

                    reject(
                        new Error(
                            "Tiempo de conexión MQTT agotado."
                        )
                    );
                }, timeoutMs);

            cliente.once(
                "connect",
                manejarConexion
            );

            cliente.once(
                "error",
                manejarError
            );
        }
    );
}

/**
 * Cierra la conexión al detener Node.js.
 */
export function cerrarMqtt() {
    return new Promise((resolve) => {
        if (!clienteMqtt) {
            resolve();
            return;
        }

        clienteMqtt.end(
            false,
            {},
            () => {
                conectado = false;
                clienteMqtt = null;
                resolve();
            }
        );
    });
}