import cv2
from util.preporcesamiento import PreprocesadorImagen

#Inicializa preprocesador
pre = PreprocesadorImagen()

#Cargar imagen

ruta = "imagenes_reales/bottle.jpeg"
imagen = cv2.imread(ruta)

if imagen is None:
    raise Exception("No se pudo cargar la imagen")

#Convertir a rgb
imagen_rgb = pre.convertir_rgb(imagen)

#Reducir ruido
imagen_ruido = pre.reducir_ruido(imagen_rgb)

#Mejorar contraste
imagen_clahe = pre.mejorar_contraste(imagen_ruido)

#Dewtectar ROI
roi, roi_info, mascara, objeto = pre.detectar_roi_contornos(
    imagen_clahe
)

if roi is None:
    print("No se encontro ningun objeto")
    exit()

print("\nROI detectado correctamente")
print(roi_info)

#Dibujarbonding box
x= roi_info["x"]
y = roi_info["y"]
w = roi_info["ancho"]
h = roi_info["alto"]

imagen_bbox = imagen_clahe.copy()

cv2.rectangle(
    imagen_bbox,
    (x, y),
    (x+w, y+h),
    (0, 255, 0),
    3
)

#Mostrar resultados
cv2.imshow("Imagen Original", cv2.cvtColor(imagen_rgb, cv2.COLOR_RGB2BGR))
cv2.imshow("CLAHE", cv2.cvtColor(imagen_clahe, cv2.COLOR_RGB2BGR))
cv2.imshow("Mascara", mascara)
cv2.imshow("Objeto", cv2.cvtColor(objeto, cv2.COLOR_RGB2BGR))
cv2.imshow("Bounding Box", cv2.cvtColor(imagen_bbox, cv2.COLOR_RGB2BGR))
cv2.imshow("ROI", cv2.cvtColor(roi, cv2.COLOR_RGB2BGR))

cv2.waitKey(0)
cv2.destroyAllWindows()