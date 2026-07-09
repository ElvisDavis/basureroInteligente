
import cv2
import numpy as np
import matplotlib.pyplot as plt
def extraer_objeto(ruta_imagen):
    img = cv2.imread(ruta_imagen)
    original = img.copy()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    #Suavizamos la imagen reducimos el ruido y pequeñas inperfecciones que podriamos generar falsos contornos
    blur = cv2.GaussianBlur(gray, (5,5),0)

    #Umbral automático OTSU
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    #detectamos el contorno
    contornos, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    

    #Validamos si hay contornos
    if len(contornos)==0:
        print("No se encontró ningun objeto")
        return None
    
    #Obtenemos el controno más grande
    contorno = max(contornos, key=cv2.contourArea)

    #Creamos un rectangulo envolvente
    #Obtenemos 
    #x->posición horizontal
    #y->posición vertical
    #w-> ancho
    #h-> alto
    x,y,w,h = cv2.boundingRect(contorno)

    #recortamos el objeto
    roi = original[
        y:y+h, 
        x:x+w
    ]
    
    #retornamos el objeto encontrado
    return roi 

# creamo suna función para mostrar la segmentacion 
def mostrar_segmentacion(ruta_imagen):
    img = cv2.imread(ruta_imagen)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray,(5, 5), 0)
    _, thresh = cv2.threshold(
        blur,
        0,
        255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    plt.figure(figsize=(12,5))

    plt.subplot(1,2,1)
    plt.imshow(
        cv2.cvtColor(
            img,
            cv2.COLOR_BGR2RGB
        )
    )
    plt.title("Imagen Original")
    plt.axis("off")

    plt.subplot(1,2,2)
    plt.imshow(
        thresh,
        cmap="gray"
    )
    plt.title("Segmentación OTSU")
    plt.axis("off")

    plt.show()