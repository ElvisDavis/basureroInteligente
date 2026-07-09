import cv2
import time
import threading

from util.preporcesamiento import PreprocesadorImagen
from util.modelo import ClasificadorResiduos


class InferenciaTiempoReal:
    """Motor de inferencia para clasifiacion de residuos en tiempo rela
    Ejecuta el preprocesamiento y la prediccion en un hilo independiente"""

    def __init__(self, ruta_modelo, ruta_clases):

        self.timestamp=None

        print("=" * 60)
        print("Iniciando motor de inferencia")
        print("=" * 60)

        #configuracion del motor 
        self.debug = False

        self.mostrar_fps = False

        self.pre = PreprocesadorImagen()

        self.modelo = ClasificadorResiduos(ruta_modelo, ruta_clases)

        self.frame = None

        self.resultado = {
            "prediccion": {
                "clase": "",
                "indice": -1,
                "confianza": 0.0,
                "ranking": [],
                "estado": {},
                "modelo": "",
                "version": "",
            },
            "metricas": {"fps": 0.0, "tiempo": 0.0},
            "debug": {
                "original": None,
                "rgb": None,
                "ruido": None,
                "contraste": None,
                "mascara": None,
                "objeto": None,
                "roi": None,
                "bounding_box": None,
                "resize": None,
            },
        }

        self.running = False

        #Máquina de estados

        self.estado = "BUSCANDO"

        #Ultima prediccion valida
        self.ultima_prediccion = None

        #Frame congelado
        self.frame_congelado = None

        #Momento enque se detectó el objeto
        self.tiempo_deteccion=0

        #Confianza minimo aceptada
        self.confianza_minim = 0.90

        #tiempo que permanecerá congelada la imagen
        self.tiempo_congelado=2.0


        self.lock = threading.Lock()

        print("Motor Listo")
        print("=" * 60)

    # Actualizar Frame
    def actualizar_frame(self, frame):
        with self.lock:
            self.frame = frame.copy()
            self.timestamp=time.time()

    # Obtener resultado
    def obtener_resultado(self):
        with self.lock:
            return self.resultado.copy()

    # Iniciar hilo
    def iniciar(self):
        #evitar iniciar múltiples hilos
        if self.running:
            return
        
        self.running=True

        hilo = threading.Thread(
            target=self._loop,
            daemon=True
        )

        hilo.start()
        print("Motor de inferencia iniciado")
        

    # Detener
    def detener(self):
        self.running = False
        print("Motor de inferencia detenido")

    #Construir resultado del sistema
    def _construir_resultado(self, resultado_modelo, datos, fps, tiempo):
        return{
            #prediccion
            "prediccion": {
                "clase": resultado_modelo["clase"],
                "indice": resultado_modelo["indice"],
                "confianza": resultado_modelo["confianza"],
                "ranking": resultado_modelo["ranking"],
                "estado": resultado_modelo["estado"],
                "modelo": resultado_modelo["modelo"],
                "version": resultado_modelo["version"]
            },
            #Metricas
            "metricas":{
                "fps": fps,
                "tiempo": tiempo,
                "timestamp":self.timestamp
            },

            #Depuracion
            "debug":{
                "original": datos.get("original"),

                "rgb": datos.get("rgb"),

                "ruido": datos.get("ruido"),
                "contraste": datos.get("contraste"),
                "mascara": datos.get("mascara"),
                "objeto": datos.get("objeto"),
                "roi": datos.get("roi"),
                "bounding_box":datos.get("bounding_box"),
                "resize":datos.get("resize"),
                "pipeline":datos.get("pipeline"),
                "shape":(
                    datos.get("resize").shape
                    if datos.get("resize") is not None
                    else None
                )
            }
        }
        

    # Loop principal del motor de inferencia
    def _loop(self):
        while self.running:
            if self.debug:
                print("Loop ejecutandose")
            # Esperar hasta recibir un frame
            if self.frame is None:
                time.sleep(0.01)
                continue
            inicio = time.time()

            # Copiar el ultimo frame de forma segura
            with self.lock:
                imagen = self.frame.copy()

            try:
                if self.debug:

                    #Paso 1
                    print("\n================PASO 1 ===============")
                    print("frame recibido")
                    print("shape:", imagen.shape)
                    print("Tipo:", type(imagen))

                # Preprocesaminto completo
                datos = self.pre.procesar_tiempo_real(imagen)

                #Paso 2
                if self.debug:
                    print("\n========== PASO 2 ==========")
                    print("Tipo de datos :", type(datos))
                    print("Claves :", datos.keys())

                #Paso 3-tensor
                if self.debug:

                    print("\n========== PASO 3 ==========")

                    print("Tensor encontrado")

                    print("Tipo :", type(datos["tensor"]))

                    print("Shape:", datos["tensor"].shape)


                    

                # Prediccion del modelo
                resultado = self.modelo.predecir(datos["tensor"])

                #Debug linea temporal
                print("RESULATDO MODELO")
                print(resultado)

                #Paso 4 Prediccion
                if self.debug:


                    print("\n========== PASO 4 ==========")

                    print("Predicción realizada correctamente")

                    print(resultado)

                # Tiempo de inferencia
                tiempo = time.time() - inicio

                fps = 1 / tiempo if tiempo > 0 else 0

                # Construir el resultado del sistema
                resultado = self._construir_resultado(
                    resultado_modelo=resultado,
                    datos=datos,
                    fps=fps,
                    tiempo=tiempo
                )
                #Pruebas debug
                print("=" * 60)
                print("RESULTADO GUARDADO EN EL MOTOR")
                print(resultado["prediccion"]["clase"])
                print(resultado["prediccion"]["confianza"])
                print("=" * 60)
                # Guardmao el resultado
                with self.lock:
                    self.resultado = resultado
            except Exception as e:
                print("\n" + "=" * 60)
                print("ERROR EN EL MOTOR DE INFERENCIA")
                print("=" * 60)
                print(e)
                with self.lock:
                    self.resultado["error"] = str(e)
                print("=" * 60)
                time.sleep(0.05)

    def obtener_frame(self):
        with self.lock:
            if self.frame is None:
                return None
            return self.frame.copy()
