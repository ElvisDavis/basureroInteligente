#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pca(0x40);

// Prueba para servos de posicion: ajustar al modelo antes de montar puertas.
const uint16_t POSICION_A_US = 1250;
const uint16_t POSICION_B_US = 1500;
const unsigned long PAUSA_MS = 3000;

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
  Serial.println("Prueba: cuatro servos, canales 0 a 3, pausa de 3 segundos.");
}

void loop() {
  Serial.println("Posicion A");
  moverTodos(POSICION_A_US);
  delay(PAUSA_MS);

  Serial.println("Posicion B");
  moverTodos(POSICION_B_US);
  delay(PAUSA_MS);
}
