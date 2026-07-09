import cv2
import matplotlib.pyplot as plt
from util.preporcesamiento import PreprocesadorImagen

pre = PreprocesadorImagen()

img = cv2.imread(
    "imagenes_reales/botella1.jpeg"
)
procesada = pre.procesar(img)

print("Forma del tensor")

print(procesada.shape)