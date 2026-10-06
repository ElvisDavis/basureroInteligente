#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pca(0x40);

// Prueba para servos de posicion: ajustar al modelo antes de montar puertas.
const uint16_t POSICION_A_US = 1250;
const uint16_t POSICION_B_US = 1500;
const unsigned long PAUSA_MS = 5000;

void moverTodos(uint16_t pulsoUs) {
  const uint16_t ticks = (uint32_t(pulsoUs) * 4096UL) / 20000UL;
  for (uint8_t canal = 0; canal < 4; canal++) {
    pca.setPWM(canal, 0, ticks);
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  if (!pca.begin()) {
    Serial.println("No se detecta el PCA9685 en 0x40. Revisa SDA, SCL y alimentacion.");
    while (true) {
      delay(1000);
    }
  }

  pca.setPWMFreq(50);
  delay(10);
  moverTodos(POSICION_A_US);
  delay(1000);
  Serial.println("Prueba: servos uno a uno, canales 0 a 3, pausa de 5 segundos.");
}

void loop() {
  for (uint8_t canal = 0; canal < 4; canal++) {
    Serial.print("Moviendo servo del canal ");
    Serial.println(canal);
    pca.setPWM(canal, 0, (uint32_t(POSICION_B_US) * 4096UL) / 20000UL);
    delay(PAUSA_MS);
    pca.setPWM(canal, 0, (uint32_t(POSICION_A_US) * 4096UL) / 20000UL);
    // Tiempo para regresar antes de mover el siguiente servo.
    delay(1000);
  }
}
