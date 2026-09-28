from datetime import datetime, timezone
from uuid import uuid4

from fastapi import (APIRouter, File, HTTPException, UploadFile, status,)
from app.api.config import (TAMANO_MAXIMO_IMAGEN, TIPOS_IMAGEN_PERMITIDOS,)
from app.api.schemas import (EstadoModelo, HealthRespuesta, ModeloInformacion, PrediccionDetalle, PrediccionRanking, PrediccionRespuesta,)
from app.api.servicios import servicio_ia

router = APIRouter()

@router.get("/")
def inicio():
    return{
        "success": True,
        "service": (
            "API de clasificación inteligente de residuos"
        ),
        "version":"1.0.0",
        "endpoints":{
            "health":"GET /api/v1/health",
            "predict":"POST /api/v1/predict",
            "documentation":"GET /docs",
        },
    }

@router.get("/health", response_model = HealthRespuesta,)
def health():
    if not servicio_ia.esta_cargado:
        raise HTTPException(
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE,
            detail = "El modelo no esta disponible",
        )

    clasificador = servicio_ia.clasificador

    return HealthRespuesta(
        status="ok",
        model=EstadoModelo(
            loaded=True,
            name=clasificador.nombre_modelo,
            version=clasificador.version_modelo,
            input_shape=[224, 224, 3],
            classes=clasificador.clases,
        ),
        timestamp=datetime.now(timezone.utc),
    )

@router.post("/predict", response_model=PrediccionRespuesta,)
async def predict(image: UploadFile = File(...),):
    if image.content_type not in TIPOS_IMAGEN_PERMITIDOS:
        raise HTTPException(
            status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail ={
                "message": "Tipo de imagen no permitido.",
                "received": image.content_type,
                "allowed": sorted(TIPOS_IMAGEN_PERMITIDOS),
            },
        )
    contenido = await image.read()

    if not contenido:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = "La imagen está vacia",
        )

    if len(contenido) > TAMANO_MAXIMO_IMAGEN:
        raise HTTPException(
            status_code = status.HTTP_413_CONTENT_TOO_LARGE,
            detail=(
                "La imagen supera el tamañoi máximo permitido de 10MB"
            ),
        )

    try:
        resultado = servicio_ia.predecir(contenido)
    except ValueError as error:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = str(error),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE,
            detail = str(error),
        ) from error

    except Exception as error:
        print("Error durante la predicción:", repr(error),)

        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = ("Ocurrió un error interno durante la predicción"),
        ) from error

    ranking = [
        PrediccionRanking(
            class_name = item["clase"],
            confidence = round(
                item["confianza"],
                6,
            ),
        )
        for item in resultado["ranking"]
    ]

    return PrediccionRespuesta(
        prediction_id = str(uuid4()),
        prediction = PrediccionDetalle(
            class_name = resultado["clase"],
            confidence = round(
                resultado["confianza"],
                6,
            ),
            confidence_percent = round(
                resultado["confianza"] *100,
                2,
            ),
        ),
        top_predictions = ranking,
        model = ModeloInformacion(
            name = resultado["modelo"],
            version = resultado["version"],
            class_count=resultado[
                "cantidad_clases"
            ],
            classes = servicio_ia.clasificador.clases,
        ),
        timestamp=datetime.now(timezone.utc),

    )



