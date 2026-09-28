from pathlib import Path

#Directorio raiz del proyecto
BASE_DIR = Path(__file__).resolve().parents[2]

#Archivos del modelo 
RUTA_MODELO = BASE_DIR / "modelo" / "modelo_residuos.keras"
RUTA_CLASES = BASE_DIR / "modelo" / "clases.json"

#Configuración de imágnes
TAMANO_ENTRADA = (224, 224)
TAMANO_MAXIMO_IMAGEN = 10 * 1024 * 1024 #10MB

TIPOS_IMAGEN_PERMITIDOS = {
    "image/jpg",
    "image/jpeg",
    "image/png",
    "image/webp",
}

#Inofrmación de la API
API_TITULO = "API de clasificación inteligente de residuos"
API_VERSION = "1.0.0"
API_PREFIX = "/api/v1"