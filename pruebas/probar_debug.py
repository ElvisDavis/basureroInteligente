import cv2

from util.preporcesamiento import PreprocesadorImagen

pre = PreprocesadorImagen()

imagen = cv2.imread(
    "imagenes_reales/bottle.jpeg"
    
)
#imagen = pre.convertir_rgb(imagen)

pre.procesar_debug(imagen)
pre.debug_rectangulo(imagen)