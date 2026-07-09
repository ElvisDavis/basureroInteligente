import cv2
import numpy as np
from tensorflow.keras.applications.efficientnet import preprocess_input
import matplotlib.pyplot as plt


class PreprocesadorImagen:

    def __init__(self):

        # Configuración general
        self.INPUT_SIZE = (224, 224)

        self.PADDING = 15

        # DETECCIÖN DE ROI

        self.AREA_MINIMA = 3000

        # Relación alto/ancho
        self.ASPECTO_MINIMO = 0.4
        self.ASPECTO_MAXIMO = 5.0

        # Distancia máxima al centro(0-1)
        self.DISTANCIA_MAXIMA = 0.80

        # Ponderación del detector
        self.PESO_AREA = 0.50

        self.PESO_SOLIDEZ=10000
        
        self.PESO_DISTANCIA = 40000
        self.PENALIZACION_ASPECTO = 5000

        self.debug = False

        # CLAHE mejora el contraste local
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

        # Kernels Morfologico

        self.kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))

        self.kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))

        self.kernel_dilate = np.ones((5, 5), np.uint8)

        # TIEMPO REAL

        self.blur_kernel = (5, 5)
        self.threshold_block_size = 31
        self.threshold_c = 5

    # CONVERTIR BGR → RGB

    def convertir_rgb(self, imagen):

        return cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)

    # Calcular rectangulo incial
    # Calcula automáticamente un trectángulo inicial para Grabcut
    def calcular_rectangulo_inicial(self, imagen):
        alto, ancho = imagen.shape[:2]

        # Imagen vertical
        if alto >= ancho:

            rect_w = int(ancho * 0.60)
            rect_h = int(alto * 0.85)
        # IMagen horizontal
        else:
            rect_w = int(ancho * 0.85)
            rect_h = int(alto * 0.60)
        x = (ancho - rect_w) // 2
        y = (alto - rect_h) // 2

        return (x, y, rect_w, rect_h)

    # Depurar rectángulo inicial del grabcut
    # Muestra el rectángulo inicial utilizando por Grabcut junto con
    # información geompetrica para verificar que el objeto se encuentra
    # correctamente dentro de la región interés
    def debug_rectangulo(self, imagen):
        # copia de ima imagen para no modificar la original
        debug = imagen.copy()
        # Dimensiones
        alto, ancho = debug.shape[:2]
        # Rectángulo calculado automáticamente
        x, y, w, h = self.calcular_rectangulo_inicial(debug)
        # Centro de la imagen
        centro_img_x = ancho // 2
        centro_img_y = alto // 2

        # Centro del rectángulo

        centro_rect_x = x + (w // 2)
        centro_rect_y = y + (h // 2)

        # Dibujar rectángulo

        cv2.rectangle(debug, (x, y), (x + w, y + h), (0, 255, 0), 3)

        # Centro de la imagen
        cv2.circle(debug, (centro_img_x, centro_img_y), 8, (255, 0, 0), -1)

        # Centro del rectángulo
        cv2.circle(debug, (centro_rect_x, centro_rect_y), 8, (255, 255, 0), -1)

        # Area ocupada

        area_imagen = ancho * alto
        area_rectangulo = w * h

        porcentaje = (area_rectangulo / area_imagen) * 100

        # Información  en consola
        print("\n" + "-" * 60)
        print(" DEPURACIÓN DEL RECTÁNGULO INICIAL ")
        print("=" * 60)
        print(f"tamaño de la imagen  :{ancho}x{alto}")
        print(f"Rectangulo (x,y)     :({x},{y})")
        print(f"REctangulo (w,h)     :({w}, {h})")
        print(f"Centro imagen        :({centro_img_x},{centro_img_y})")
        print(f"Centro rectángulo    :({centro_rect_x},{centro_rect_y})")
        print(f"Area imagen          :{area_imagen:,}")
        print(f"Area rectangulo      :{area_rectangulo:,}")
        print(f"Porcentaje           :{porcentaje:.2f}%")

        print("=" * 60)

        # Mostrar
        plt.figure(figsize=(8, 8))
        plt.imshow(cv2.cvtColor(debug, cv2.COLOR_BGR2RGB))
        plt.title("Rectangulo inteligente para GrabCut")
        plt.axis("off")
        plt.show()

    # REDUCIR RUIDO

    def reducir_ruido(self, imagen):

        return cv2.GaussianBlur(imagen, (5, 5), 0)

    # MEJORAR CONTRASTE

    def mejorar_contraste(self, imagen):

        lab = cv2.cvtColor(imagen, cv2.COLOR_RGB2LAB)

        # Separar canales

        l, a, b = cv2.split(lab)

        # Aplicamos CLAHE unicamente sobre la luminancia

        l = self.clahe.apply(l)

        # Unir nuevamente
        lab = cv2.merge((l, a, b))

        # Regresar a BGR
        imagen_mejorada = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

        return imagen_mejorada
    
    #Preprocesamiento base
    def _preprocesar_base(self, imagen):
        #Ejecuta el preprocesamiento común utilizando por todos los pipelines del sistema
        #Conversión BGR a RGB
        rgb = self.convertir_rgb(imagen)

        #Reducción de ruido
        ruido = self.reducir_ruido(rgb)

        #Mejora contraste
        contraste = self.mejorar_contraste(ruido)

        return{
            "rgb": rgb,
            "ruido": ruido,
            "contraste": contraste
        }


    # Segmentar con grabcut
    def segmentar_grabcut(self, imagen):
        # obtenemos las dimensiones
        alto, ancho = imagen.shape[:2]

        # Mascara inicial
        mascara = np.zeros((alto, ancho), np.uint8)

        # Modleos internos de Grabcut
        modelo_fondo = np.zeros((1, 65), np.float64)
        modelo_objeto = np.zeros((1, 65), np.float64)

        # Rectangulo inicial inteligente
        rectangulo = self.calcular_rectangulo_inicial(imagen)

        #Obtener coordenadas del rectangulo
        x, y, w, h = rectangulo

        # depuracion
        if self.debug:
            print("\n"+"=" * 60)
            print("RECTÁNGULO INICIAL GRABCUT")
            print("=" * 60)

            print(f"Rectángulo : {rectangulo}")
            print(f"x       : {x}")
            print(f"y       : {y}")
            print(f"Ancho   : {w}")
            print(f"Alto    : {h}")
            print(f"Imagen  : {imagen.shape}")
            print("=" * 60)

        # Ejecutar Grabcut
        cv2.grabCut(
            imagen,
            mascara,
            rectangulo,
            modelo_fondo,
            modelo_objeto,
            1,
            cv2.GC_INIT_WITH_RECT,
        )

        # Construir mascara binaria
        mascara = np.where(
            (mascara == cv2.GC_BGD) | (mascara == cv2.GC_PR_BGD), 0, 1
        ).astype("uint8")

        # Aplicar mascara
        resultado = cv2.bitwise_and(imagen, imagen, mask=mascara)
        return resultado, mascara

    # Limpiar mascara

    def limpiar_mascara(self, mascara):

        # convertimos a 0 y 255

        mascara = (mascara * 255).astype(np.uint8)

        # cerrramos huecos

        mascara = cv2.morphologyEx(
            mascara, cv2.MORPH_CLOSE, self.kernel_close, iterations=2
        )

        # Eliminar pequeñas regiones

        mascara = cv2.morphologyEx(
            mascara, cv2.MORPH_OPEN, self.kernel_open, iterations=1
        )

        # UNIR zonas separadas
        mascara = cv2.dilate(mascara, self.kernel_dilate, iterations=1)

        # Volver a binaria
        _, mascara = cv2.threshold(mascara, 127, 255, cv2.THRESH_BINARY)
        return mascara

    # Obtener todos los contornos de la máscara
    def obtener_contornos(self, mascara):
        # Obtenemos los contornos externos presentes en la máscara binaria.
        contornos, _ = cv2.findContours(
            mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        return contornos

    # Función buscar PADDING
    def calcular_PADDING(self, w, h):
        # calcula el PADDING dinámico dependiendo del tamaño del objeto detectado
        lado = max(w, h)
        PADDING = int(lado * 0.05)
        PADDING = max(8, PADDING)
        PADDING = min(25, PADDING)
        return PADDING

    # Obtener mascara grabcut
    def obtener_mascara_grabcut(self, imagen):
        # Depuramos
        if self.debug:
            print(">>> Encontrando a segmentar_grabcut")
        _, mascara = self.segmentar_grabcut(imagen)
        # depurasmos
        if self.debug:
            print(">>> Grabcut finalizo")

        mascara = self.limpiar_mascara(mascara)
        if self.debug:
            print(">>> Mascara limpiada")

        return mascara

    # Obtener contorno
    def obtener_contorno(self, mascara):
        contornos = self.obtener_contornos(mascara)

        if len(contornos) == 0:
            return None

        alto, ancho = mascara.shape

        mejor_contorno = None
        mejor_score = -np.inf

        if self.debug:
            print("\n================CONTORNOS=================")

        for contorno in contornos:

            propiedades = self.calcular_propiedades_contorno(contorno, mascara)

            if propiedades is None:
                continue

            score = self.calcular_score(propiedades)

            if self.debug:
                print(f"Area       :{propiedades['area']:.0f}")
                print(f"Aspecto    :{propiedades['aspecto']:.2f}")
                print(f"Solidez    :{propiedades['solidez']:.2f}")
                print(f"Distancia  :{propiedades['distancia']:.2f}")
                print(f"Score      :{score:.2f}")
                print("------------------------------------------")

            if score > mejor_score:
                mejor_score = score
                mejor_contorno = contorno
            if self.debug:
                print("==========================================")
        return mejor_contorno

    # Funcion calcular propiedades de contorno
    def calcular_propiedades_contorno(self, contorno, mascara):
        alto, ancho = mascara.shape

        # buscamos el area
        area = cv2.contourArea(contorno)

        if area < self.AREA_MINIMA:
            return None

        # Dibujamos el rectangulo
        x, y, w, h = cv2.boundingRect(contorno)

        if w == 0:
            return None

        aspecto = h / float(w)

        if aspecto < self.ASPECTO_MINIMO:
            return None

        if aspecto > self.ASPECTO_MAXIMO:
            return None

        # Centro del contorno
        cx = x + w / 2
        cy = y + h / 2

        # Centro de la imagen
        centro_x = ancho / 2
        centro_y = alto / 2

        # Distancia normalizada
        distancia = np.sqrt((cx - centro_x) ** 2 + (cy - centro_y) ** 2)

        distancia /= np.sqrt(ancho**2 + alto**2)

        if distancia > self.DISTANCIA_MAXIMA:
            return None

        # Convex HUll
        hull = cv2.convexHull(contorno)

        area_hull = cv2.contourArea(hull)

        if area_hull == 0:
            return None

        solidez = area / area_hull

        return {
            "area": area,
            "aspecto": aspecto,
            "solidez": solidez,
            "distancia": distancia,
            "bounding_box": (x, y, w, h),
            "centro": (cx, cy),
        }

    # Calcular score de un contorno
    def calcular_score(self, propiedades):
        # Calcula un puntaje para determinar que contorno representa mejor el objeto principal

        area = propiedades["area"]
        aspecto = propiedades["aspecto"]
        solidez = propiedades["solidez"]
        distancia = propiedades["distancia"]

        # Penalización por aspecto
        PENALIZACION_ASPECTO = 0

        if aspecto < self.ASPECTO_MINIMO:
            PENALIZACION_ASPECTO = self.PENALIZACION_ASPECTO
        elif aspecto > self.ASPECTO_MAXIMO:
            PENALIZACION_ASPECTO = self.PENALIZACION_ASPECTO

        # Score final
        score = (
            area * self.PESO_AREA
            + solidez * self.PESO_SOLIDEZ
            - distancia * self.PESO_DISTANCIA
            - PENALIZACION_ASPECTO
        )
        return score

    # ROI DE LA MASCARA
    def extraer_roi_grabcut(self, imagen, mascara=None):

        # Reutilizar mascara si ya existe
        if mascara is None:
            mascara = self.obtener_mascara_grabcut(imagen)

        # Obtener el mejor contorno

        contorno = self.obtener_contorno(mascara)

        if contorno is None:
            if self.debug:
                print("No se encontro un objeto valido")
            return imagen, None, mascara

        # Area del contorno
        area = cv2.contourArea(contorno)

        if self.debug:
            print("\n" + "=" * 60)
            print("ROI DETECTADO")
            print("=" * 60)
            print(f"Area  :{area:.0f}")

        # Bounding Box

        x, y, w, h = cv2.boundingRect(contorno)

        if self.debug:
            print(f"Bounding Box : ({x},{y},{w},{h})")

        # PADDING
        PADDING = self.calcular_PADDING(w, h)
        x = max(0, x - PADDING)
        y = max(0, y - PADDING)

        w = min(imagen.shape[1] - x, w + PADDING * 2)
        h = min(imagen.shape[0] - y, h + PADDING * 2)

        if self.debug:
            print(f"ROI Final  : ({x},{y},{w},{h})")

        # Extraer ROI

        # Aplicar la mascara sobre la imagen
        objeto = cv2.bitwise_and(imagen, imagen, mask=mascara)

        # extraer unicamente la región del objeto
        roi = objeto[y : y + h, x : x + w].copy()

        # Validar ROI
        if roi.size == 0:
            if self.debug:
                print("ROI vacio")
            return imagen, None, mascara

        pixeles_objeto = cv2.countNonZero(mascara[y : y + h, x : x + w])
        ocupacion = pixeles_objeto / (w * h)
        if self.debug:
            print("=" * 60)
            print(f"Ocupación ROI : {ocupacion:.2%}")
            print("=" * 60)

        informacion_roi = {
            "bounding_box": (x, y, w, h),
            "area": area,
            "PADDING": PADDING,
            "ocupacion": ocupacion,
        }

        return roi, informacion_roi, mascara

    # REDIMENSIONAR

    def redimensionar(self, imagen):

        return cv2.resize(imagen, (224, 224))

    # CONVERTIR A TENSOR

    def convertir_tensor(self, imagen):

        imagen = np.array(imagen, dtype=np.float32)

        imagen = np.expand_dims(imagen, axis=0)

        return imagen

    # NORMALIZAR

    def normalizar(self, imagen):

        return preprocess_input(imagen)

    # PIPELINE COMPLETO

    def procesar(self, imagen):

        resultado = self.procesar_completo(imagen)
        return resultado["tensor"]

    # Pipeline completo con la información de depuración
    def procesar_completo(self, imagen):
        # ejecuta todo el pipeline de preprocesamiento y devuelve tanto el tensor para la CNN como toda la información
        # necesaria para depuración y visualizacion

        if imagen is None:
            raise ValueError("La imagen recibida es None")

        # imagen original
        original = imagen.copy()

        # depuramos
        if self.debug:
            print("1. - Imagen copiada")

        # Conversion RGB
       
        #rgb = self.convertir_rgb(original)

        # depuramos
        if self.debug:
            print("2 - RGB")

        # reducir el ruido
        
        #ruido = self.reducir_ruido(rgb)

        # depuramos
        if self.debug:
            print("3 -Ruido")

        # CLAHE
        #contraste = self.mejorar_contraste(ruido)

        datos = self._preprocesar_base(original)

        rgb = datos["rgb"]
        ruido = datos["ruido"]
        contraste = datos["contraste"]

        # Depuramos
        if self.debug:
            print("4 - CLAHE")

        # Mascara Grabcut
        mascara = self.obtener_mascara_grabcut(contraste)

        # Depuramos
        if self.debug:
            print("5 - Grabcut terminado")

        # ROI
        roi, roi_info, mascara = self.extraer_roi_grabcut(contraste, mascara)

        # depuramos
        if self.debug:
            print("6 - ROI encontrado")

        if roi is None or roi.size == 0:
            raise ValueError("No fue posible extraer el ROI")

        # Resize
        resize = self.redimensionar(roi)

        # Depuramos
        if self.debug:
            print("7 - Resize")

        # Tensor
        tensor = self.convertir_tensor(resize)

        # depuramos
        if self.debug:
            print("8 - Tensor")

        # Normalización
        tensor = self.normalizar(tensor)

        # Depuramos
        if self.debug:
            print("9 - Normalizado")

        # Objeto segmetado
        objeto = cv2.bitwise_and(contraste, contraste, mask=mascara)

        # Depurado
        if self.debug:
            print("10 - Pipeline terminado")

        # Resultado
        return {
            "original": original,
            "rgb": rgb,
            "ruido": ruido,
            "contraste": contraste,
            "mascara": mascara,
            "objeto": objeto,
            "roi": roi,
            "roi_info": roi_info,
            "resize": resize,
            "tensor": tensor,
            "pipeline": "GrabCut +CLAHE +EfficientNet",
        }

    #

    def detectar_roi_contornos(self, imagen):
        """
        Detecta el objeto principal mediante contornos,
        Devuelve el ROI, la mascara, la imagen segmentada,
        y la información del bounding box
        """

        # Escala de grises
        gris = cv2.cvtColor(imagen, cv2.COLOR_RGB2GRAY)

        # Suavizado
        gris = cv2.GaussianBlur(gris, (5,5), 0)

        # Deteccion de bordes
        bordes = cv2.Canny(
            gris,
            50,
            150
        )
        #Dilatar los bordes
        bordes = cv2.dilate(
            bordes,
            self.kernel_dilate,
            iterations=2
        )

        #Cerrar huecos
        bordes = cv2.morphologyEx(
            bordes,
            cv2.MORPH_CLOSE,
            self.kernel_close
        )

        # Buscar contornos
        contornos, _ = cv2.findContours(
            bordes, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )

        print("Numero de contornos encontrados:", len(contornos))

        if len(contornos) == 0:
            return None, None, None, None

               
        mejor_contorno = None
        mejor_puntaje = -1

        alto, ancho = imagen.shape[:2]

        cx_img = ancho /2
        cy_img = alto /2

        for contorno in contornos:
            area = cv2.contourArea(contorno)

            x, y, w, h, = cv2.boundingRect(contorno)

            aspecto = w /h

            print("------------------------------------")
            print("Area :", area)
            print("Aspecto :", aspecto)
            print("------------------------------------")

            if area < self.AREA_MINIMA:
                print("Descartado por area")
                continue
            
            
            
            if aspecto < self.ASPECTO_MINIMO:
                print("Descartado por aspecto minimo")
                continue

            if aspecto > self.ASPECTO_MAXIMO:
                print("Descartado por aspecto maximo")
                continue

            M = cv2.moments(contorno)

            if M["m00"] == 0:
                continue

            cx = M["m10"] / M["m00"]
            cy = M["m01"]/ M["m00"]

            distancia = np.sqrt(
                (cx -cx_img) **2 +
                (cy -cy_img) ** 2
            )

            distancia /= np.sqrt(cx_img**2 +cy_img**2)

            print("Distancia al centro:", distancia)


            if distancia > self.DISTANCIA_MAXIMA:
                print("Descartado por distancia al centro")
                continue

            puntaje = (
                area * self.PESO_AREA
                - distancia * self.PESO_DISTANCIA
            )

            if puntaje > mejor_puntaje:

                mejor_puntaje = puntaje
                mejor_contorno = contorno
        if mejor_contorno is None:
            print("No se encontro un contorno valido")
            #return None, None, None, None
        
        if mejor_contorno is None:
            return None, None, None, None,

        contorno = mejor_contorno
        area = cv2.contourArea(contorno)
    

        
        #Bounding BOX
        x, y, w, h = cv2.boundingRect(contorno)

        #PADDING
        x= max(0, x- self.PADDING)
        y = max(0, y - self.PADDING)

        w = min(imagen.shape[1] - x, w +2*self.PADDING)
        h= min(imagen.shape[0] - y, h+2*self.PADDING)

        
        lado = max(w, h)

        cx = x + w //2
        cy = y +h //2

        x= max(0, cx - lado // 2)
        y= max(0, cy - lado //2)

        lado = min(
            lado, 
            imagen.shape[1] -x,
            imagen.shape[0] -y
        )

        roi = imagen[
            y:y+lado,
            x:x+lado
        ]
        #MAscara

        mascara = np.zeros(gris.shape, dtype=np.uint8)

        cv2.drawContours(
            mascara,
            [contorno],
            -1,
            255,
            thickness = cv2.FILLED
        )

        objeto = cv2.bitwise_and(
            imagen,
            imagen,
            mask = mascara
        )

        roi_info = {
            "x" : x,
            "y" : y,
            "ancho": w,
            "alto":h,
            "area":area
        }

        return(
            roi,
            roi_info,
            bordes,
            objeto
        )
    

    #Procesar tiempo real
    def procesar_tiempo_real(self, imagen):
        #Pipeline tiempo real
        if imagen is None:
            raise ValueError("Imagen vacia")
        
        #Imagen original
        original = imagen.copy()

        datos = self._preprocesar_base(original)
        rgb = datos["rgb"]
        ruido = datos["ruido"]
        contraste = datos["contraste"]

        #detectar ROI mediante contornos
        roi, roi_info, mascara, objeto = self.detectar_roi_contornos(contraste)

        print("ROI INFO:", roi_info)


        if roi is not None:
            #Redimensionar
            resize = self.redimensionar(roi)
        else:
            #Si no se detecta ROI, redimensionamos la imagen completa
            resize = self.redimensionar(contraste)
        

        #tensor
        tensor = self.convertir_tensor(resize)

        #Normalizacion
        tensor = self.normalizar(tensor)
        return {
            "original": original,

            "rgb": rgb,

            "ruido": ruido,

            "contraste": contraste,

            "mascara": mascara,

            "objeto": objeto,
            "roi": roi,

            "bounding_box": roi_info,

            "resize": resize,

            "tensor": tensor,

            "pipeline": "Tiempo Real", 
            

        }


    # DEPURAR EL PREPROCESAMIENTO

    def procesar_debug(self, imagen):

        # Ejecutar todo el pipeline
        datos = self.procesar_completo(imagen)
        original = datos["original"]
        rgb = datos["rgb"]
        ruido = datos["ruido"]
        contraste = datos["contraste"]
        mascara = datos["mascara"]
        objeto = datos["objeto"]
        roi = datos["roi"]
        resize = datos["resize"]
        info_roi = datos["roi_info"]

        # Dibujar Bounding box
        imagen_box = contraste.copy()

        if info_roi is not None:
            x, y, w, h = info_roi["bounding_box"]

            cv2.rectangle(imagen_box, (x, y), (x + w, y + h), (0, 255, 0), 3)

            print("\n==========INFORMACIÓN R0I============")
            print(f"Area       :{info_roi['area']:.0f}")
            print(f"PADDING    :{info_roi['PADDING']}")
            print(f"Ocupacion  :{info_roi['ocupacion']:.2%}")

        # Mostrar resultados

        plt.figure(figsize=(16, 9))

        plt.subplot(2, 4, 1)
        plt.imshow(cv2.cvtColor(original, cv2.COLOR_BGR2RGB))
        plt.title("Original")
        plt.axis("off")

        plt.subplot(2, 4, 2)
        plt.imshow(rgb)
        plt.title("ORIGINAL RGB")
        plt.axis("off")

        plt.subplot(2, 4, 3)
        plt.imshow(ruido)
        plt.title("Reducción de ruido")
        plt.axis("off")

        plt.subplot(2, 4, 4)
        plt.imshow(contraste)
        plt.title("CLAHE")
        plt.axis("off")

        plt.subplot(2, 4, 5)
        plt.imshow(imagen_box)
        plt.title("Bounding Box")
        plt.axis("off")

        plt.subplot(2, 4, 6)
        plt.imshow(mascara, cmap="gray")
        plt.title("Mascara GrabCut")
        plt.axis("off")

        plt.subplot(2, 4, 7)
        plt.imshow(objeto)
        plt.title("Objeto Segmentado")
        plt.axis("off")

        plt.subplot(2, 4, 8)
        plt.imshow(resize)
        plt.title("Resize 224x224")
        plt.axis("off")

        plt.tight_layout()

        plt.show()
