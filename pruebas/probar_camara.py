from app.camara import Camara
from util.inferencia import InferenciaTiempoReal
import cv2
from util.ui.visualizador import Visualizador
import time

# Iniciamos la camara
cam = Camara()

ESTADO_BUSCANDO = 0
ESTADO_MOSTRADO = 1
ESTADO_ESPERADO = 2

# Iniciamos Ia
motor = InferenciaTiempoReal("modelo/modelo_residuos.keras", "modelo/clases.json")
motor.iniciar()
visual = Visualizador()

#Control de desteccion
OBJETO_LIBRE = 0
OBJETO_DETECTADO = 1

estado = OBJETO_LIBRE

ultima_clase=""

ultima_deteccion=0

TIEMPO_ESPERA = 2.0
# Loop principal
while True:

    frame = cam.leer()

    if frame is None:
        break

    # Encviar frame al motor IA
    motor.actualizar_frame(frame)

    

    # recuperacion del resultado
    resultado = motor.obtener_resultado()

    pred = resultado["prediccion"]

    #MAQUINA DE ESTADO

    if estado == OBJETO_LIBRE:
        #Existe una prediccion valida
        if(pred["indice"]>=0 and pred["confianza"] >= 90):
            ultima_clase = pred["clase"]
            ultima_deteccion = time.time()
            estado = OBJETO_DETECTADO

    elif estado == OBJETO_DETECTADO:

        #Esperamos unos segundos msotrando el resultado
        if time.time() - ultima_deteccion >= TIEMPO_ESPERA:
            estado = OBJETO_LIBRE
    '''met= resultado["metricas"]
    debug = resultado["debug"]

    "Mostrar la imagen que entra a la cNN solo para depuracion"
    imagen_cnn = debug.get("resize")
    if imagen_cnn is not None:
        cv2.imshow(
        "Entrada CNN",
        cv2.cvtColor(imagen_cnn, cv2.COLOR_RGB2BGR)
        )'''
    
    print(resultado["debug"]["bounding_box"])
    
    visual.render(
        frame,
        resultado, estado
    )  

    #Salida por teclado
   
    tecla = cv2.waitKey(1) & 0xFF

    if tecla == ord("q"):
        break

# Liberar recursos
motor.detener()
cam.liberar()
cv2.destroyAllWindows()
