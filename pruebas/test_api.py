"""
Pruebas de integración para la API de inteligencia artificial
Estas pruebas comprueban:

1. Que el modelo se carga correctamente
2. Que el endpoint de salud responda
3. Que las imagenes conocidas se clasifican correctamente
4. Que la respuesta conserva el contrato esperado
5. Que la API rechaza archivos incorrectos
6. Que la API controla imágnes vacías, corruptas o demasiadao grandes

Las pruebas utilizan el modelo real. Por ese motivo, la primera
ejecución puede tardar varios segundos mientras TensorfLOW carga
EfficientNetB0 y sus pesos
"""
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from app.api.config import (BASE_DIR, TAMANO_MAXIMO_IMAGEN,)
from app.api.main import app

#Configurar imagenes de prueba
CARPETA_IMAGENES = BASE_DIR / "imagenes_reales"

#Relación entre imágenes conocidad y el resultado esperado.
# Esta tabla funciona como prueba de regresión: si un cambio futuro
#hace que una imagen conocida cambie inesperadamente de categoria
#pytest mostrará inmediatamente cual clasificación fallo
IMAGENES_CON_RESULTADO_ESPERADO = [
    (
        CARPETA_IMAGENES / "gatorade.jpeg", "plastic"
    ),
    (
        CARPETA_IMAGENES / "lata1.jpg",
        "metal",
    ),
    (
        CARPETA_IMAGENES / "imagenvidrio2.jpg",
        "glass",
    ),
    (
        CARPETA_IMAGENES / "papel.jpeg",
        "cardboard",
    ),

]
# FIXTURE DEL CLIENTE
# ============================================================

@pytest.fixture(scope="module")
def cliente():
    """
    Crea un cliente de prueba para FastAPI.

    El bloque `with` es importante porque ejecuta el ciclo de vida
    de la aplicación:

        inicio -> cargar modelo -> pruebas -> descargar modelo

    El alcance `module` permite cargar el modelo una sola vez para
    todas las pruebas de este archivo.
    """

    with TestClient(app) as cliente_pruebas:
        yield cliente_pruebas


# ============================================================
# FUNCIÓN AUXILIAR
# ============================================================

def enviar_imagen(
    cliente_pruebas: TestClient,
    ruta_imagen: Path,
):
    """
    Envía una imagen JPEG al endpoint de predicción.

    Args:
        cliente_pruebas:
            Cliente de pruebas proporcionado por FastAPI.

        ruta_imagen:
            Ruta de la imagen que se enviará.

    Returns:
        Respuesta HTTP producida por la API.
    """

    # Evitamos obtener un error confuso si una imagen fue movida
    # o eliminada accidentalmente.
    assert ruta_imagen.exists(), (
        f"No se encontró la imagen de prueba: {ruta_imagen}"
    )

    with ruta_imagen.open("rb") as archivo:
        return cliente_pruebas.post(
            "/api/v1/predict",
            files={
                "image": (
                    ruta_imagen.name,
                    archivo,
                    "image/jpeg",
                )
            },
        )


# ============================================================
# PRUEBAS DE ESTADO
# ============================================================

def test_health_responde_correctamente(cliente):
    """
    Comprueba que la API y el modelo estén disponibles.
    """

    respuesta = cliente.get(
        "/api/v1/health"
    )

    assert respuesta.status_code == 200

    datos = respuesta.json()

    assert datos["success"] is True
    assert datos["status"] == "ok"
    assert datos["model"]["loaded"] is True
    assert datos["model"]["name"] == "EfficientNetB0"
    assert datos["model"]["input_shape"] == [
        224,
        224,
        3,
    ]

    assert datos["model"]["classes"] == [
        "cardboard",
        "glass",
        "metal",
        "paper",
        "plastic",
        "trash",
    ]


def test_documentacion_openapi_disponible(cliente):
    """
    Comprueba que FastAPI genere el esquema OpenAPI.

    Node.js podrá utilizar este contrato para conocer los
    endpoints y las estructuras de respuesta.
    """

    respuesta = cliente.get(
        "/openapi.json"
    )

    assert respuesta.status_code == 200

    datos = respuesta.json()

    assert "/api/v1/predict" in datos["paths"]
    assert "/api/v1/health" in datos["paths"]


# ============================================================
# PRUEBAS DE PREDICCIÓN
# ============================================================

@pytest.mark.parametrize(
    "ruta_imagen,clase_esperada",
    IMAGENES_CON_RESULTADO_ESPERADO,
)
def test_clasifica_imagenes_conocidas(
    cliente,
    ruta_imagen,
    clase_esperada,
):
    """
    Comprueba la clasificación de imágenes conocidas.

    No se establece todavía un mínimo de confianza porque el
    umbral deberá calibrarse experimentalmente antes de controlar
    las puertas del basurero.
    """

    respuesta = enviar_imagen(
        cliente,
        ruta_imagen,
    )

    assert respuesta.status_code == 200

    datos = respuesta.json()

    assert datos["success"] is True

    assert (
        datos["prediction"]["class"]
        == clase_esperada
    )

    # La confianza decimal debe permanecer entre 0 y 1.
    confianza = datos["prediction"]["confidence"]

    assert 0.0 <= confianza <= 1.0

    # El porcentaje debe permanecer entre 0 y 100.
    porcentaje = datos[
        "prediction"
    ]["confidence_percent"]

    assert 0.0 <= porcentaje <= 100.0


def test_respuesta_contiene_identificador_uuid(cliente):
    """
    Comprueba que cada predicción reciba un UUID válido.

    Este identificador se utilizará posteriormente para relacionar:

        predicción -> depósito -> comando MQTT -> puntos
    """

    respuesta = enviar_imagen(
        cliente,
        CARPETA_IMAGENES / "gatorade.jpeg",
    )

    assert respuesta.status_code == 200

    prediction_id = respuesta.json()[
        "prediction_id"
    ]

    # UUID() genera una excepción si el texto no tiene
    # un formato UUID válido.
    identificador = UUID(prediction_id)

    assert str(identificador) == prediction_id


def test_respuesta_contiene_top_tres(cliente):
    """
    Comprueba que la API devuelva un máximo de tres predicciones
    ordenadas desde la mayor hasta la menor confianza.
    """

    respuesta = enviar_imagen(
        cliente,
        CARPETA_IMAGENES / "gatorade.jpeg",
    )

    assert respuesta.status_code == 200

    ranking = respuesta.json()[
        "top_predictions"
    ]

    assert 1 <= len(ranking) <= 3

    confianzas = [
        item["confidence"]
        for item in ranking
    ]

    assert confianzas == sorted(
        confianzas,
        reverse=True,
    )


# ============================================================
# PRUEBAS DE ERRORES
# ============================================================

def test_rechaza_solicitud_sin_imagen(cliente):
    """
    FastAPI debe rechazar la solicitud cuando no se envía
    el campo multipart llamado `image`.
    """

    respuesta = cliente.post(
        "/api/v1/predict"
    )

    assert respuesta.status_code == 422


def test_rechaza_tipo_mime_no_permitido(cliente):
    """
    Comprueba que un archivo de texto no sea aceptado como imagen.
    """

    respuesta = cliente.post(
        "/api/v1/predict",
        files={
            "image": (
                "documento.txt",
                b"Esto no es una imagen.",
                "text/plain",
            )
        },
    )

    assert respuesta.status_code == 415


def test_rechaza_imagen_vacia(cliente):
    """
    Comprueba que un archivo vacío no llegue al modelo.
    """

    respuesta = cliente.post(
        "/api/v1/predict",
        files={
            "image": (
                "vacia.jpg",
                b"",
                "image/jpeg",
            )
        },
    )

    assert respuesta.status_code == 400


def test_rechaza_imagen_corrupta(cliente):
    """
    El tipo MIME puede decir `image/jpeg`, pero el contenido
    podría no ser realmente una imagen.

    OpenCV debe detectar este caso durante la decodificación.
    """

    respuesta = cliente.post(
        "/api/v1/predict",
        files={
            "image": (
                "corrupta.jpg",
                b"contenido que no representa un JPEG",
                "image/jpeg",
            )
        },
    )

    assert respuesta.status_code == 400


def test_rechaza_imagen_demasiado_grande(cliente):
    """
    Comprueba el límite máximo configurado para las imágenes.

    Se crea contenido en memoria; no se guarda ningún archivo
    temporal en el proyecto.
    """

    contenido_grande = b"0" * (
        TAMANO_MAXIMO_IMAGEN + 1
    )

    respuesta = cliente.post(
        "/api/v1/predict",
        files={
            "image": (
                "grande.jpg",
                contenido_grande,
                "image/jpeg",
            )
        },
    )

    assert respuesta.status_code == 413