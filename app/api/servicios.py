from threading import Lock

import cv2
import numpy as np

from app.api.config import(RUTA_CLASES, RUTA_MODELO, TAMANO_ENTRADA,)
from util.modelo import ClasificadorResiduos

class ServicioIA:
    """
    Servicio encargado de cargar y ejecutar el modelo

    No administra unsuario, puntos, MQTT ni dispositivos
    Su única responsabilidad es clasificar imagenes
    """

    def __init__(self):
        self.clasificador = None
        self.lock_modelo = Lock()

    @property
    def esta_cargado(self):
        return self.clasificador is not None

    def cargar(self):
        if self.esta_cargado:
            return

        if not RUTA_MODELO.exists():
            raise FileNotFoundError(f"No se encontro el modelo: {RUTA_MODELO}")

        if not RUTA_CLASES.exists():
            raise FileNotFoundError(f"No se encontro el archivo de clases: " f"{RUTA_CLASES}")

        self.clasificador = ClasificadorResiduos(str(RUTA_MODELO), str(RUTA_CLASES),)

    def descargar(self):
        self.clasificador=None

    def decodificar_imagen(self, contenido):
        if not contenido:
            raise ValueError("El archivo de imagen está vacio")

        arreglo = np.frombuffer(contenido, dtype= np.uint8,)

        imagen_bgr = cv2.imdecode(arreglo, cv2.IMREAD_COLOR,)

        if  imagen_bgr is None:
            raise ValueError("No fue posible decodificar la imagen")

        return imagen_bgr

    def preparar_tensor(self, imagen_bgr):
        """
        Mantiene uann entrada compatible con l entrenamiento:

        BGR -> RGB -> 224x224 -> float32 -> batch
        
        """

        imagen_bgr = cv2.cvtColor(imagen_bgr, cv2.COLOR_BGR2RGB,)

        imagen_redimensionada = cv2.resize(imagen_bgr, TAMANO_ENTRADA, interpolation=cv2.INTER_AREA,)

        tensor = imagen_redimensionada.astype(np.float32)
        tensor = np.expand_dims(tensor, axis=0,)

        return tensor

    def predecir(self, contenido):
        if not self.esta_cargado:
            raise RuntimeError("El modelo todavia no esta cargado")

        imagen_bgr = self.decodificar_imagen(contenido)

        tensor = self.preparar_tensor(imagen_bgr)

        #La primera versión procesa una predicción 
        #simultanea para proteger la instabcia del modelo
        with self.lock_modelo:
            resultado = self.clasificador.predecir(tensor)
            return resultado

#Instancia única utilizada por FastAPI
servicio_ia = ServicioIA()