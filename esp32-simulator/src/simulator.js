import "dotenv/config";
import mqtt from "mqtt";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883";

const DEVICE_ID = process.env.MQTT_DEVICE_ID ?? "bin-01";

const SIMULATION_DELAY_MS = Number(process.env.SIMULATION_DELAY_MS ?? 3000);

const AUTO_CONFIRM = process.env.AUTO_CONFIRM !== "false";

const TOPICS = Object.freeze({
    openCommand:
        `smartbin/${DEVICE_ID}/commands/open`,

    depositConfirmed:
        `smartbin/${DEVICE_ID}/events/deposit-confirmed`,

    status:
        `smartbin/${DEVICE_ID}/status`,
});

const depositosProcesando = new Set();

const cliente = mqtt.connect(
    MQTT_URL,
    {
        clientId:
            `esp32-simulator-${DEVICE_ID}-${Date.now()}`,

        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 5000,

        will: {
            topic: TOPICS.status,
            payload: JSON.stringify({
                deviceId: DEVICE_ID,
                status: "OFFLINE",
            }),
            qos: 1,
            retain: true,
        },
    }
);

function publicarEstado(status) {
    const mensaje = JSON.stringify({
        deviceId: DEVICE_ID,
        status,
        simulated: true,
        timestamp: new Date().toISOString(),
    });

    cliente.publish(
        TOPICS.status,
        mensaje,
        {
            qos: 1,
            retain: true,
        }
    );
}

function confirmarDeposito({
    depositId,
    compartment,
}) {
    const confirmacion = JSON.stringify({
        depositId,
        deviceId: DEVICE_ID,
        compartment,
        sensor: "SIMULATED",
        timestamp: new Date().toISOString(),
    });

    cliente.publish(
        TOPICS.depositConfirmed,
        confirmacion,
        {
            qos: 1,
            retain: false,
        },
        (error) => {
            depositosProcesando.delete(
                depositId
            );

            if (error) {
                console.error(
                    "No se pudo publicar la confirmación:",
                    error.message
                );

                return;
            }

            console.log(
                "Depósito confirmado:",
                depositId
            );
        }
    );
}

function procesarOrden(mensaje) {
    let orden;

    try {
        orden = JSON.parse(
            mensaje.toString("utf8")
        );
    } catch {
        console.error(
            "Orden MQTT con JSON inválido."
        );

        return;
    }

    if (orden.command !== "OPEN" || typeof orden.depositId !== "string" || typeof orden.compartment !== "string" ) {
        console.error(
            "Orden MQTT inválida:",
            orden
        );

        return;
    }

    if (depositosProcesando.has(orden.depositId)) {
        console.log("La orden ya se está procesando:", orden.depositId);

        return;
    }

    depositosProcesando.add(
        orden.depositId
    );

    console.log("");
    console.log("Orden recibida");
    console.log(
        "Depósito:",
        orden.depositId
    );
    console.log(
        "Compartimento:",
        orden.compartment
    );
    console.log(
        "Simulando apertura..."
    );

    if (!AUTO_CONFIRM) {
        console.log(
            "Confirmación automática desactivada."
        );

        depositosProcesando.delete(
            orden.depositId
        );

        return;
    }

    setTimeout(
        () => {
            console.log(
                "Simulando detección del residuo..."
            );

            confirmarDeposito(orden);
        },
        SIMULATION_DELAY_MS
    );
}

cliente.on("connect", () => {
    console.log(
        `Simulador conectado a ${MQTT_URL}`
    );

    cliente.subscribe(
        TOPICS.openCommand,
        {
            qos: 1,
        },
        (error) => {
            if (error) {
                console.error(
                    "Error al suscribirse:",
                    error.message
                );

                return;
            }

            console.log(
                `Escuchando: ${TOPICS.openCommand}`
            );

            publicarEstado("ONLINE");
        }
    );
});

cliente.on(
    "message",
    (topic, mensaje) => {
        if (
            topic === TOPICS.openCommand
        ) {
            procesarOrden(mensaje);
        }
    }
);

cliente.on("reconnect", () => {
    console.log(
        "Intentando reconectar con Mosquitto..."
    );
});

cliente.on("offline", () => {
    console.log(
        "Simulador desconectado de Mosquitto."
    );
});

cliente.on("error", (error) => {
    console.error(
        "Error MQTT:",
        error.message
    );
});

function cerrarSimulador() {
    console.log(
        "\nCerrando simulador..."
    );

    publicarEstado("OFFLINE");

    setTimeout(
        () => {
            cliente.end(
                false,
                {},
                () => process.exit(0)
            );
        },
        300
    );
}

process.on(
    "SIGINT",
    cerrarSimulador
);

process.on(
    "SIGTERM",
    cerrarSimulador
);