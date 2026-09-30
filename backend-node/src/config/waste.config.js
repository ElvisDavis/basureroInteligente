/**
 * Reglas de clasificación, puntos y compartimentos.
 *
 * Las claves deben coincidir exactamente con las clases
 * devueltas por el modelo de inteligencia artificial.
 */
export const WASTE_RULES = Object.freeze({
    plastic: Object.freeze({
        points: 10,
        compartment: "plastic",
        recyclable: true,
    }),

    glass: Object.freeze({
        points: 15,
        compartment: "glass",
        recyclable: true,
    }),

    metal: Object.freeze({
        points: 20,
        compartment: "metal",
        recyclable: true,
    }),

    paper: Object.freeze({
        points: 5,
        compartment: "paper_cardboard",
        recyclable: true,
    }),

    cardboard: Object.freeze({
        points: 5,
        compartment: "paper_cardboard",
        recyclable: true,
    }),

    trash: Object.freeze({
        points: 0,
        compartment: null,
        recyclable: false,
    }),
});

/**
 * Confianza mínima necesaria para autorizar la apertura.
 */
export const MINIMUM_CONFIDENCE = 0.70;

export function obtenerReglaResiduo(
    wasteClass
) {
    return WASTE_RULES[wasteClass] ?? null;
}