# Prueba fisica: ESP32 + PCA9685 + cuatro servos

El programa esta en `prueba_servos/prueba_servos.ino`.
Controla los canales 0, 1, 2 y 3 del PCA9685 y mueve los servos uno a uno.
Cada servo va a la posicion B, espera 5000 ms y vuelve a la posicion A.
Espera 1000 ms para el regreso antes de pasar al siguiente canal; luego repite.

## Conexion

| ESP32 | PCA9685 |
| --- | --- |
| GPIO 21 | SDA |
| GPIO 22 | SCL |
| 3.3 V | VCC |
| GND | GND |

Conectar los servos a los canales 0 a 3 respetando GND, V+ y senal.
Alimentar V+ con una fuente externa del voltaje y corriente adecuados para
los servos. Compartir GND entre la fuente, el modulo y el ESP32.
No alimentar los servos desde el pin de 3.3 V del ESP32.

## Carga

1. En Arduino IDE instalar la placa `esp32 by Espressif Systems`.
2. En el Gestor de bibliotecas instalar `Adafruit PWM Servo Driver Library`
   y sus dependencias, incluida `Adafruit BusIO`.
3. Abrir `prueba_servos/prueba_servos.ino`.
4. Seleccionar el modelo de ESP32 y el puerto USB.
5. Verificar y subir el programa.
6. Abrir el monitor serie a 115200 baudios.

El PCA9685 debe tener la direccion I2C 0x40 (configuracion habitual).
Los pulsos iniciales son 1250 y 1500 microsegundos a 50 Hz para probar un
recorrido moderado con servos de posicion. Ajustarlos al modelo utilizado.
Probar primero sin conectar el mecanismo de las puertas.

Esta prueba se ejecuta de forma autonoma y no recibe ordenes MQTT de la app.
La aplicacion Flutter y las APIs permanecen en la computadora.
La compilacion y el movimiento fisico aun deben verificarse con la placa.
