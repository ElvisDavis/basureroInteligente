from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.config import (API_PREFIX, API_TITULO, API_VERSION,)
from app.api.routes import router
from app.api.servicios import servicio_ia

@asynccontextmanager
async def lifespan(_app: FastAPI):
    print("=" * 60)
    print("INICIANDO API DE INTELIGENCIA ARTIFICIAL")
    print("=" * 60)

    servicio_ia.cargar()
    print("API preparada correctamente")
    yield

    print("=" * 60)
    print("DETENIENDO API")
    print("=" * 60)

    servicio_ia.descargar()

app= FastAPI(
    title = API_TITULO,
    version = API_VERSION,
    description =(
        "Microservicio de clasificación de residuos mediante TensorFlow y EfficentNetB0"
    ),
    lifespan = lifespan,
)

app.include_router(
    router,
    prefix = API_PREFIX,
    tags = ["Inteligencia artificial"],
)

@app.get("/")
def raiz():
    return{
        "service": API_TITULO,
        "version": API_VERSION,
        "documentation": "/docs",
        "health": f"{API_PREFIX}/health",
        "predict":f"{API_PREFIX}/predict",
    }