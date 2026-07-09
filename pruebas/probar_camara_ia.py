import cv2
import time
from util.preporcesamiento import PreprocesadorImagen
from util.modelo import ClasificadorResiduos

#Cargamos los componentes necesarios
print("="*60)
print("SISTEMA INTELIGENTE DE CLASIFICACION")
print("="*60)

pre = PreprocesadorImagen()
modelo = ClasificadorResiduos(
    "modelo/modelo_residuos.keras",
    "modelo/clases.json"
)

print("SIstema inicializado correctamente.\n")

#Abrir camara
camara = cv2.VideoCapture(0)
if not camara.isOpened():
    raise Exception("No se pudo abrir la camara")
camara.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
camara.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
print("Camara iniciada correctamente")

#VAriables
contador=0
ultima_clase = "-----"
ultima_confianza=0.0

ultimo_tiempo = time.time()

fps=0

#Bucle principal
while True:

    ok, frame = camara.read()

    if not ok:
        break

    contador +=1

    #Calcular FPS
    tiempo_actual = time.time()
    fps = 1 / (tiempo_actual -ultimo_tiempo)
    ultimo_tiempo = tiempo_actual

    #Clasificar cada 10 frame
    if contador %10 == 0:
        try:
            tensor = pre.procesar(frame)
            resultado = modelo.predecir(tensor)
            ultima_clase = resultado["clase"].upper()
            ultima_confianza = resultado["confianza"]*100
        except Exception as e:
            print(e)
    
    #Panel superior
    cv2.rectangle(
        frame,
        (0,0),
        (1280.120),
        (0,0,0),
        -1
    )

    #Titulo
    cv2.putText(
        frame,
        "SISTEMA INTELIGENTE DE CLASIFICACION",
        (20,35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0,255,255),
        2
    )

    #Clase
    cv2.putText(
        frame,
        f"Clase:  {ultima_clase}",
        (20.70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0,255,0),
        2
    )

    #Confianza
    cv2.putText(
        frame,
        f"Confianza: {ultima_confianza:.2f}%",
        (320,70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0,255,0),
        2
    )

    #FPS
    cv2.putText(
        frame,
        f"FPS: {fps:.0f}",
        (700,70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255,255,0),
        2
    )

    #FRAME
    cv2.imshow(
        "SISTEMA INTELIGENTE DE CLASIFICACION",
        frame
    )

    tecla = cv2.waitKey(2)

    if tecla == 27:
        break
#CERRAR
camara.release()
cv2.destroyAllWindows()