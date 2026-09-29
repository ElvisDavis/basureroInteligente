/**
 * Punto de entrada del backend Node.js.
 *
 * Este archivo abre el puerto HTTP y gestiona el cierre
 * controlado del proceso.
 */

import app from "./app.js";
import { env } from "./config/env.js";


const server = app.listen(
  env.PORT,
  "127.0.0.1",
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
      `Dirección: http://127.0.0.1:${env.PORT}`
    );

    console.log(
      `FastAPI: ${env.AI_API_URL}`
    );

    console.log(
      "=".repeat(60)
    );
  }
);


/**
 * Finaliza el servidor sin interrumpir solicitudes activas.
 */
function cerrarServidor(signal) {
  console.log(
    `\nSeñal ${signal} recibida. Cerrando servidor...`
  );

  server.close((error) => {
    if (error) {
      console.error(
        "No fue posible cerrar el servidor:",
        error
      );

      process.exit(1);
    }

    console.log(
      "Servidor detenido correctamente."
    );

    process.exit(0);
  });
}


process.on(
  "SIGINT",
  () => cerrarServidor("SIGINT")
);

process.on(
  "SIGTERM",
  () => cerrarServidor("SIGTERM")
);