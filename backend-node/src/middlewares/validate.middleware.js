/**
 * Crea un middleware reutilizable para validar request.body.
 */
export function validarCuerpo(esquema) {
    return (request, _response, next) => {
        const resultado = esquema.safeParse(
            request.body
        );

        if (!resultado.success) {
            const error = new Error(
                "Los datos enviados no son válidos."
            );

            error.statusCode = 400;
            error.code = "VALIDATION_ERROR";
            error.details = resultado.error.issues.map(
                (issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })
            );

            return next(error);
        }

        /**
         * Conservamos solamente los campos validados.
         */
        request.validatedBody = resultado.data;

        return next();
    };
}