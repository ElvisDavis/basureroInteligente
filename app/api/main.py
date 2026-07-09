from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.api.routes import router
from app.api.servicios import servicio 


@asynccontextmanager
async def lifespan(app: FastAPI):

    print("=" *60)
    print("INICIANDO API")
    print("=" * 60)

    servicio.iniciar()

    yield

    print("=" *60)
    print("DETENIENDO API")
    print("=" * 60)
    servicio.detener()

app = FastAPI(
    title = "SISTEMA INTELIGENTE DE CLASIFICACIÓN DE RESIDUOS",
    version = "1.0.0",
    description = "API REST basada en Inteligencia Artificial",
    lifespan =lifespan
)
app.include_router(router)





    
