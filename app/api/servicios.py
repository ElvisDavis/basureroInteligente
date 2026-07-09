from app.camara import Camara
from util.inferencia import InferenciaTiempoReal
import time
import threading


class ServicioIA:
    def __init__(self):
        
        self.camara = None
        self.motor = None

        self.iniciado = False

        self.hilo_camara= None
    
    def iniciar(self):
        if self.iniciado:
            return
        print("1 - Creando cámara")
        self.camara = Camara()

        print("2 - Cámara creada")
        self.motor = InferenciaTiempoReal(
            "modelo/modelo_residuos.keras",
            "modelo/clases.json"
        )

        print("3 - Motor creado")
        self.motor.iniciar()

        print("4 - Motor iniciado")
        self.iniciado = True

        print("5 - Iniciando hilo cámara")
        self.hilo_camara = threading.Thread(
            target=self._capturar,
            daemon=True
        )
        self.hilo_camara.start()

        print("6 - Hilo iniciado")
        print("Servicio iniciado correctamente")

    def obtener_resultado(self):

       return self.motor.obtener_resultado()
    
    def detener(self):

        if self.motor is not None:
            self.motor.detener()
        
        if self.camara is not None:
            self.camara.liberar()

        self.iniciado = False

    def _capturar(self):
        while self.iniciado:
            frame = self.camara.leer()
            if frame is not None:
                self.motor.actualizar_frame(frame)
            time.sleep(0.01)
    
#Instalcia unica
servicio = ServicioIA()
