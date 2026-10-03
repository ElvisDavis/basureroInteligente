/**
 * Punto de entrada del backend Node.js.
 *
 * Este archivo abre el puerto HTTP y gestiona el cierre
 * controlado del proceso.
 */

import app from "./app.js";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";
import {
    cerrarMqtt,
    iniciarMqtt,
} from "./services/mqtt.service.js";

/**
 * Iniciamos MQTT antes de abrir el servidor HTTP.
 * El cliente se reconectará automáticamente si Mosquitto
 * no está disponible temporalmente.
 */
iniciarMqtt();

const server = app.listen(
    env.PORT,
    "0.0.0.0",
    () => {
        console.log(
            "=".repeat(60)
        );
        console.log(
            "BACKEND PRINCIPAL INICIADO"
        );
        console.log(
            `Entorno: ${env.NODE_ENV}`
        );
        console.log(
            `Dirección: http://0.0.0.0:${env.PORT}`
        );
        console.log(
            `FastAPI: ${env.AI_API_URL}`
        );
        console.log(
            `MQTT: ${env.MQTT_URL}`
        );
        console.log(
            "=".repeat(60)
        );
    }
);

let cerrando = false;

async function cerrarServidor(signal) {
    if (cerrando) {
        return;
    }

    cerrando = true;

    console.log(
        `\nSeñal ${signal} recibida. Cerrando servidor...`
    );

    server.close(async (error) => {
        if (error) {
            console.error(
                "No fue posible cerrar HTTP:",
                error
            );
        }

        await cerrarMqtt();
        await prisma.$disconnect();

        console.log(
            "Servidor detenido correctamente."
        );

        process.exit(
            error ? 1 : 0
        );
    });
}

process.on(
    "SIGINT",
    () => {
        void cerrarServidor("SIGINT");
    }
);

process.on(
    "SIGTERM",
    () => {
        void cerrarServidor("SIGTERM");
    }
);