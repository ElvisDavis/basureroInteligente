import cv2

from util.preporcesamiento import PreprocesadorImagen
from util.modelo import ClasificadorResiduos

#Cargar los componentes

pre = PreprocesadorImagen()

modelo = ClasificadorResiduos(
    "modelo/modelo_residuos.keras",
    "modelo/clases.json"
)


#Imagen de prueba
ruta = "imagenes_reales/bottle.jpeg"

imagen = cv2.imread(ruta)

if imagen is None:
    raise Exception("No se pudo cargar la imagen")

#Obtener el ROI
rgb = pre.convertir_rgb(imagen)

ruido = pre.reducir_ruido(rgb)

contraste = pre.mejorar_contraste(ruido)

roi, _, _ = pre.extraer_roi_grabcut(contraste)
#Preprocesamiento


tensor = pre.procesar(imagen)

#Prediccion

resultado = modelo.predecir(tensor)

print(modelo.generar_reportes(resultado))


if resultado["confianza"] >= 0.80:
    print("Resultado validado automáticamente.")

elif resultado["confianza"] >= 0.60:
    print("Resultado aceptable.")

else:
    print("Se recomienda revisar la imagen.")

#Visualizacion

modelo.visualizar_resultado(
    roi,
    resultado
)
