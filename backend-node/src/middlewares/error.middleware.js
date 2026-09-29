/**
 * Middleware global de errores.
 *
 * Express reconoce un middleware de errores porque recibe
 * cuatro argumentos: error, request, response y next.
 */

// eslint-disable-next-line no-unused-vars
export function manejarError(
    error,
    _request,
    response,
    _next
) {
    /**
     * Express genera este error cuando recibe JSON mal formado.
     */
    if (
        error instanceof SyntaxError &&
        error.status === 400
    ) {
        return response.status(400).json({
            success: false,
            error: {
                code: "INVALID_JSON",
                message:
                    "El cuerpo JSON de la solicitud es inválido.",
            },
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Los errores esperados pueden proporcionar:
     * - statusCode;
     * - code;
     * - message;
     * - details.
     */
    if (
        Number.isInteger(error.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode <= 599
    ) {
        return response
            .status(error.statusCode)
            .json({
                success: false,
                error: {
                    code:
                        error.code ??
                        "CONTROLLED_ERROR",
                    message: error.message,
                    ...(error.details !== undefined
                        ? {
                              details:
                                  error.details,
                          }
                        : {}),
                },
                timestamp:
                    new Date().toISOString(),
            });
    }

    /**
     * El detalle completo queda únicamente en la consola.
     * Nunca enviamos error.stack al cliente.
     */
    console.error("Error no controlado:", error);

    return response.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message:
                "Ocurrió un error interno.",
        },
        timestamp: new Date().toISOString(),
    });
}