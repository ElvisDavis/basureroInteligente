import cv2
from datetime import datetime


class Visualizador:

    def __init__(self):
        pass

    def dibujar_texto(
        self,
        imagen,
        texto,
        posicion,
        color=(0,255,0),
        escala=0.7
    ):

        cv2.putText(
            imagen,
            texto,
            posicion,
            cv2.FONT_HERSHEY_SIMPLEX,
            escala,
            color,
            2,
            cv2.LINE_AA
        )

    def dibujar_bbox(
        self,
        imagen,
        bbox,
        color=(0,255,0)
    ):

        if bbox is None:
            return

        cv2.rectangle(
            imagen,
            (bbox["x"], bbox["y"]),
            (
                bbox["x"]+bbox["ancho"],
                bbox["y"]+bbox["alto"]
            ),
            color,
            2
        )

    def render(self, frame, resultado, estado):

        #obtener datos
        pred = resultado["prediccion"]
        met = resultado["metricas"]
        debug = resultado["debug"]
        hora = datetime.now().strftime("%H:%M:%S")

        color = self.obtener_color_confianza(pred["confianza"])
        
        #dibujamos el panel 
        self.dibujar_panel(frame)
        
        estado = self.obtener_estado(pred["confianza"])
        self.dibujar_barra_confianza(
            frame,
            pred["confianza"],
            (140,56)
        )
        self.dibujar_texto(
            frame,
            f"Estado : {estado}",
            (20,150),
            color
        )
        

        if pred["indice"]>=0:

            

            self.dibujar_bbox(frame, debug.get("bounding_box"), color)

            self.dibujar_texto(
                frame,
                f"Clase : {pred['clase']}",
                (20,30),
                color
            )

            self.dibujar_texto(
                frame,
                f"Confianza : {pred['confianza']*100:.2f} %",
                (20,60),
                color
            )

            self.dibujar_texto(
                frame,
                f"FPS : {met['fps']:.2f}",
                (20,90),
                color
            )

            self.dibujar_texto(
                frame,
                f"Modelo : {pred['modelo']}",
                (20,120),
                color
            )
            self.dibujar_texto(
                frame,
                hora,
                (260,170),
                (255,255,255),
                0.55
            )

        self.mostrar(frame)

    

    def obtener_color_confianza(self, confianza):
        if confianza >= 0.90:
            return (0, 255, 0)
        
        elif confianza >= 0.70:
            return (0, 255, 255)
        
        elif confianza >= 0.50:
            return(0, 165, 255)
        
        return (0,0,255)
    
    def mostrar(self, imagen):

        cv2.imshow(
            "Clasificador Inteligente",
            imagen
        )

    def dibujar_panel(self, imagen, ancho=380, alto=180):

        overlay = imagen.copy()

        cv2.rectangle(
            overlay,
            (10,10),
            (10+ancho,10+alto),
            (30,30,30),
            -1
        )

        alpha = 0.55

        cv2.addWeighted(
            overlay,
            alpha,
            imagen,
            1-alpha,
            0,
            imagen
        )
    def dibujar_barra_confianza(self, imagen, confianza, posicion):

        x,y = posicion

        ancho = 220

        alto = 18

        cv2.rectangle(
            imagen,
            (x,y),
            (x+ancho,y+alto),
            (90,90,90),
            2
        )

        progreso = int(ancho * confianza)

        color = self.obtener_color_confianza(confianza)

        cv2.rectangle(
            imagen,
            (x,y),
            (x+progreso,y+alto),
            color,
            -1
        )
    
    def obtener_estado(self, confianza):

        if confianza >=0.95:
            return "Excelente"

        if confianza >=0.85:
            return "Muy Buena"

        if confianza >=0.70:
            return "Buena"

        if confianza >=0.50:
            return "Aceptable"

        return "Baja"


    
    