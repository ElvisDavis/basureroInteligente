/**
 * Middleware para recibir imágenes mediante multipart/form-data
 * 
 * La imagen se mantiene temporalmente en memoria para enviarla
 * directamente a FastAPI. No se guarda en l disco del servidor
 */

import multer from "multer";

/**
 * Tamaño máximo permitidos 10Mb
 * 
 * Este límite debe coincidir con el configurado en FastAPI
 */
const TAMANO_MAXIMO_IMAGEN = 10* 1024*1024;

/**
 * Tipos MIME aceptados poe el sistema
 */

const TIPOS_PERMITIDOS = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",

]);

/**
 * memoryStorage coloca el archivo en request.file.buffer
 */

const almacenamiento=multer.memoryStorage();

const cargador = multer({
    storage: almacenamiento,

    limits: {
        fileSize: TAMANO_MAXIMO_IMAGEN,
        files:1,
    },

    fileFilter: (_request, archivo, callback)=>{
        if(!TIPOS_PERMITIDOS.has(archivo.mimetype)){
            const error = new Error("El tipo de imagen enviado no esta permitido");

            error.statusCode=415;
            error.code = "UNSUPPORTED_IMAGE_TYPE";
            error.details = {
                received: archivo.mimetype,
                allowed: [...TIPOS_PERMITIDOS],
            };
            return callback(error);
        }
        return callback(null, true);
    },
});

/**
 * Ejecuta Multer y transforma sus errores en respustas
 * controladas por nuestro backend
 */
export function recibirImagen(request, response, next){
    const procesarArchivo = cargador.single("image");

    procesarArchivo(request, response, (error) => {
        if (!error){
            return next();
        }

        /**
         * Multer genera esté código cuando la imagen supera 10MB
         */
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"){
            error.statusCode = 413;
            error.code = "IMAGE_TOO_LARGE";
            error.message = "La imagen supera el tamaño máximo permitido de 10MB";
        }
        /**
         * Se genera cuando el campo no se llama image o se envian 
         * varios archivos
         */
        if (error instanceof multer.MulterError && error.code === "LIMIT_UNEXPECTED_FILE"){
            error.statusCode = 400;
            error.code = "UNEXPECTED_FILE";
            error.message = "Debe enviar una sola imagen utilizando el campo image";
        }
        return next(error);
    });
}