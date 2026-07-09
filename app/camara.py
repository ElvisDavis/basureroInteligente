import cv2


class Camara:
    """
    Gestiona la captura de video desde una camara
    """

    def __init__(self, indice=0):
        self.cap = cv2.VideoCapture(indice, cv2.CAP_DSHOW)

        if not self.cap.isOpened():
            raise Exception("No se pudo abrir la camara")

        # Configuraciones recomedadas de la camara
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.cap.set(cv2.CAP_PROP_FPS, 30)

    # Leer el frame
    def leer(self):
        ok, frame = self.cap.read()

        if not ok:
            return None

        return frame

    # Liberar camara
    def liberar(self):
        self.cap.release()
