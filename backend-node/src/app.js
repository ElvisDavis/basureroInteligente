/**
 * Configuracipon principal de Express
 * 
 * Este archivo construye la aplicación, pro no abre ningun
 * puerto, Esta separación permite probar la API con Supertest
 * sin iniciar un servidor real.
 */
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { manejarError } from "./middlewares/error.middleware.js";
import { rutaNoEncontrada } from "./middlewares/not-found.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import predictionRoutes from "./routes/prediction.routes.js";
import authRoutes from "./routes/auth.routes.js";
import internalRoutes from "./routes/internal.routes.js";

const app = express();

/**
 * Oculta la cabecera x-Powere-By para anunciar
 * innecesariamente que el servidor utiliza EXpress
 */

app.disable("x-powered-by");

/**
 * Helmet incorpora encabezados HTTP de seguridad
 */

app.use(helmet());

/**
 * Configuración CORS
 * 
 * Durante el desarrollo CORS_ORIGIN puede ser "*".
 * Cuando Flutter Web o un panel administartivo tenga una URL
 * fija, remplazaremos "*" por el origen permitido
 */
app.use(
    cors({
        origin: env.CORS_ORIGIN,
    })
);

/**
 * Limita el tamaño de solicitudes JSON
 * 
 * Las imágenes no llegran como JSON; posteriormente se
 * recibiran mediante multipart/form-data
 */
app.use(
    express.json({
        limit:"1mb",
    })
);

/**
 * Permite reciir formularios URL encoded sencillos
 */
app.use(
    express.urlencoded({
        extended:false,
        limit: "1mb"
    })
);

/**
 * Registra las solicitudes duarante el desarrollo 
 */
if (env.NODE_ENV !== "test"){
    app.use(morgan("dev"));
}

/**
 * Ruta principal informativa del backend
 */
app.get("/", (_request, response)=>{
    return response.status(200).json({
        success:true,
        service: "Backend principal de reciclaje",
        version: "1.0.0",
        endpoints: {
            health: "GET /api/v1/health",
            register: "POST /api/v1/auth/register",
            login: "POST /api/v1/auth/login",
            profile: "GET /api/v1/auth/me",
            predict: "POST /api/v1/deposits/predict",
        },
    });
});

/**
 * Rutas versionadas
 * 
 * Las rutas declaradas dentro de ambos routers comienzan
 * desde /api/v1
 */
app.use("/api/v1", authRoutes);
app.use("/api/v1", healthRoutes);
app.use("/api/v1", predictionRoutes);
app.use("/api/v1", internalRoutes)



/**
 * Estos middlewares deben permnecer al final
 */
app.use(rutaNoEncontrada);
app.use(manejarError);

export default app;