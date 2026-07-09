from fastapi import APIRouter
from app.api.servicios import servicio


router = APIRouter()



#Iniciar el servicio
#servicio.iniciar()

@router.get("/")
def inicio():
    return{
        "mensaje" : "API de Clasificación Inteligente funcionando"

    }

@router.get("/health")
def health():

    return{
        "estado":"OK",
        "modelo":"EfficientNetB0",
        "servicio":servicio.iniciado
    }

@router.get("/predict")
def predict():

    resultado = servicio.obtener_resultado()

    '''if resultado is None:
        return{
            "error":"No existe un resultado"
        }
    
    print("=" * 60)
    print("RESPUESTA API")
    print(resultado)
    print("=" * 60)
    return resultado'''
    return {
        "clase":resultado["prediccion"]["clase"],
        "confianza": resultado["prediccion"]["confianza"],
        "fps":resultado["metricas"]["fps"]
    }