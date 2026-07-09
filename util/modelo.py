import tensorflow as tf
from tensorflow.keras.applications.efficientnet import preprocess_input
import json
from tensorflow.keras.preprocessing import image
import numpy as np
import cv2
import matplotlib.pyplot as plt


class ClasificadorResiduos:
    # Creamos la funcion init
    def __init__(self, ruta_modelo, ruta_clases):

        self.nombre_modelo = "EfficientNetB0"
        self.version_modelo = "1.0"

        print("cargando el modelo...")

        self.modelo = tf.keras.models.load_model(
            ruta_modelo, custom_objects={"preprocess_input": preprocess_input}
        )

        print("Modelo cargado correctamente")
        print(f"Modelo  :{self.nombre_modelo}")
        print(f"Version :{self.version_modelo}")

        with open(ruta_clases, "r") as archivo:
            self.clases = json.load(archivo)

        print("clases cargadas")
        print(self.clases)
    
        # ======================================================
    
    
    #Predicción desde un tensor
    def predecir(self, tensor):

        #Validaciones
        if tensor is None:
            raise ValueError("El tensor recibido es None")
        if not isinstance(tensor, np.ndarray):
            raise TypeError("El tensor debe ser un numpy.ndarray")
        
        if tensor.ndim != 4:
            raise ValueError(
                f"El tensor debe tener 4 dimensiones (batch, alto, ancho, canales)"
                f"Se recibio un tensor de {tensor.ndim} dimensiones"
            )
        
        if tensor.shape[1:] != (224, 224, 3):
            raise ValueError(
                f"Se esperab un rensor con forma (1, 224, 224, 3)"
                f"Se recibió {tensor.shape}"
            )
        #Predicciones del modelo
        probabilidades = self.modelo.predict(
            tensor,
            verbose=0
        )[0]

        
        #Indice de mayor probabilidad
        indice = int(np.argmax(probabilidades))

        confianza = float(probabilidades[indice])

        #Top de predicciones
        ranking = []
                
        for i in np.argsort(probabilidades)[::-1]:
            ranking.append({
                "indice": int(i),
                "clase":self.clases[i],
                "confianza":float(probabilidades[i])

            })

        evaluacion = self.evaluar_confianza(confianza)
        return {
            "clase": self.clases[indice],
            "indice": indice,
            "confianza": confianza,
            "ranking": ranking[:3],
            "estado":evaluacion,
            "modelo": self.nombre_modelo,
            "version": self.version_modelo,
            "cantidad_clases":len(self.clases)
        }
    
    #Evaluar confianza
    def evaluar_confianza(self, confianza):

        porcentaje = confianza * 100

        #Realizamos la condicional
        if porcentaje >=95:
            return{
                "nivel": 5,
                "estado": "Excelente",
                "mensaje": "Predicción prácticamente segura"
            }
        elif porcentaje >=90:
            return{
                "nivel":4.5,
                "estado":"Muy alta",
                "mensaje":"La clasificación es altamente confiable."

            }
        
        elif porcentaje >= 80:
            return {
                "nivel":4,
                "estado":"Alta",
                "mensaje": "Existe una alta probabilidad de que la clase sea correcta."
            }
        elif porcentaje >= 70:
            return{
                "nivel": 3.5,
                "estado":"Buena",
                "mensaje": "La clasificacion es aceptable"
            }
        elif porcentaje >=60:
            return{
                "nivel": 3,
                "estado":"Aceptable",
                "mensaje":"La clasificación puede contener errores"
            }
        
        elif porcentaje >=50:
            return{
                "nivel":2.5,
                "estado":"Baja",
                "mensaje":"Se recomienda revisar la imagen"
            }
        else:
            return{
                "nivel":2,
                "estado": "No confiable",
                "mensaje":"No es posible garantizar la clasificación"
            }
        
    #Generar reporte de prediccion
    def generar_reportes(self, resultado):
       estado = resultado["estado"]

       reporte=[]

       reporte.append("="*65)
       reporte.append("  SISTEMA INTELIGENTE DE CLASIFICACIÓN")
       reporte.append("="*65)
       reporte.append("")

       reporte.append(f"Clase Detectada :{resultado['clase'].upper()}")
       reporte.append(f"Índice          : {resultado['indice']}")
       reporte.append(f"Confianza       : {resultado['confianza']*100:.2f}%")
       reporte.append(f"Modelo          : {resultado['modelo']}")
       reporte.append(f"Version         : {resultado['version']}")

       reporte.append("")
       reporte.append("EVALUACIÓN IA")
       reporte.append("-" * 45)

       reporte.append(f"Nivel           : {estado['nivel']}/5")
       reporte.append(f"Estado          : {estado['estado']}")
       reporte.append(f"Observación     : {estado['mensaje']}")

       reporte.append("")
       reporte.append("TOP 3 PREDICCIONES")
       reporte.append("-" * 45)

       for i, item in enumerate(resultado["ranking"][:3], start=1):
           reporte.append(
               f"{i}. {item['clase'].upper():12}"
               f"{item['confianza']*100:7.2f}%"
           )
           
       reporte.append("")
       reporte.append("="*65)

       return "\n".join(reporte)
               
        


    
    #Funcion visualizar resultado
    def visualizar_resultado(self, roi, resultado):
        #imagen = imagen_rgb.copy()

        prediccion= resultado
        clase = prediccion["clase"].upper()
        confianza = prediccion["confianza"] *100

        #Evauación del modelo
        evaluacion = prediccion["estado"]
        nivel = evaluacion["nivel"]
        estado=evaluacion["estado"]
        observacion= evaluacion["mensaje"]
        modelo = prediccion["modelo"]
        version = prediccion["version"]

        #Color según confianza
        if confianza >= 90:
            color_estado="green"
        elif confianza >= 80:
            color_estado="darkgreen"
        elif confianza >= 70:
            color_estado="orange"
        else:
            color_estado="red"
       

        #Figura principal

        fig = plt.figure(figsize=(13,7))
        fig.suptitle(
            "SISTEMA INTELIGENTE DE CLASIFICACIÓN DE RESIDUOS",
            fontsize = 18,
            fontweight = "bold"
        )

        #Imagen
        ax1 = plt.subplot(1,2,1)
        ax1.imshow(roi)
        ax1.set_title(
            "Objeto Detectado",
            fontsize = 14
        )
        ax1.axis("off")

        #Panel de información 
        ax2 = plt.subplot(1,2,2)
        ax2.axis("off")

        #Titulo
        ax2.text(
            0.02,
            0.96,
            "RESULTADO DE LA CLASIFICACIÓN",
            fontsize=16,
            fontweight="bold",
            color="darkblue"
        )

        #Clase
        ax2.text(
            0.02,
            0.87,
            "Clase Detectada:",
            fontsize=13,
            fontweight="bold"
        )
        ax2.text(
            0.55,
            0.87,
            clase,
            fontsize=14,
            color="green",
            fontweight="bold"
        )

        #Confianza
        ax2.text(
            0.02,
            0.72,
            "Confianza:",
            fontsize=13,
            fontweight="bold"
        )

        ax2.text(
            0.55,
            0.72,
            f"{confianza:.2f}%",
            fontsize=13
        )

        #NIvel IA
        ax2.text(
            0.02,
            0.69,
            "Nivel IA:",
            fontsize=13,
            fontweight="bold"

        )

        ax2.text(
            0.55,
            0.69,
            f"{nivel}/5",
            fontsize=13
        )

        #Estado
        ax2.text(
            0.02,
            0.60,
            "Estado:",
            fontsize=13,
            fontweight="bold"
        )
        ax2.text(
            0.55,
            0.60,
            estado,
            fontsize=13,
            color=color_estado,
            fontweight="bold"
        )

        #Observacion
        ax2.text(
            0.02,
            0.51,
            "Observación:",
            fontsize=13,
            fontweight="bold"
        )

        ax2.text(
            0.02,
            0.43,
            observacion,
            fontsize=12,
            wrap=True
        )

        #Modelo

        ax2.text(
            0.02,
            0.28,
            "Modelo:",
            fontsize=13,
            fontweight="bold"
        )

        ax2.text(
            0.55,
            0.28,
            modelo,
            fontsize=12
        )

        #Version
        ax2.text(
            0.02,
            0.20,
            "Version:",
            fontsize=13,
            fontweight="bold"
        )

        ax2.text(
            0.55,
            0.20,
            version,
            fontsize=12
        )

        #Top 3
        ax2.text(
            0.02,
            0.10,
            "TOP 3 PREDICCIONES",
            fontsize=13,
            fontweight="bold"
        )
        y=0.05
        for i, item in enumerate(resultado["ranking"][:3],start=1):
            ax2.text(
                0.04,
                y,
                f"{i}. {item['clase'].upper()} ({item['confianza']*100:.2f}%)",
                fontsize=11
            )
            y -=0.05
        plt.tight_layout()      

        plt.show()
        
        

    


