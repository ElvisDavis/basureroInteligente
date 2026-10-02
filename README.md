# SmartBin — Sistema Inteligente de Reciclaje

SmartBin es una plataforma de reciclaje inteligente que utiliza visión artificial para clasificar residuos, MQTT para controlar un basurero automatizado y una aplicación Flutter para gestionar usuarios, depósitos y puntos ecológicos.

El sistema permite capturar automáticamente una fotografía, reconocer el tipo de residuo mediante un modelo EfficientNetB0, abrir el compartimento correspondiente y acreditar puntos cuando el dispositivo confirma el depósito.

## Funcionalidades

- Registro de usuarios.
- Verificación de correo mediante código de seis dígitos.
- Inicio de sesión con JWT.
- Contraseñas protegidas con bcrypt.
- Captura automática desde la cámara.
- Selección manual desde la galería.
- Clasificación de residuos con inteligencia artificial.
- Comunicación en tiempo real mediante MQTT.
- Simulación de apertura y detección de residuos.
- Acreditación automática de puntos.
- Historial de depósitos.
- Interfaz ecológica y adaptable.
- Compatibilidad con Flutter Web y Android.
- Pruebas automatizadas del backend, Flutter y simulador.

## Materiales reconocidos

El modelo puede clasificar las siguientes categorías:

- Cartón
- Vidrio
- Metal
- Papel
- Plástico
- Basura general

## Arquitectura

```mermaid
flowchart LR
    U[Usuario] --> F[Aplicación Flutter]
    F -->|JWT + imagen| N[Backend Node.js]
    N -->|Imagen| A[FastAPI + EfficientNetB0]
    A -->|Predicción| N
    N -->|Guardar depósito| P[(PostgreSQL)]
    N -->|Orden OPEN| M[Broker MQTT]
    M --> E[ESP32 o simulador]
    E -->|Depósito confirmado| M
    M --> N
    N -->|Acreditar puntos| P
    N -->|Resultado e historial| F
    N -->|Código de verificación| G[Gmail SMTP]
```

## Tecnologías

### Aplicación

- Flutter
- Dart
- Material 3
- `camera`
- `image_picker`
- `http`
- `shared_preferences`

### Backend principal

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JWT
- bcrypt
- Zod
- Multer
- Nodemailer
- MQTT

### Inteligencia artificial

- Python
- FastAPI
- TensorFlow
- Keras
- EfficientNetB0
- OpenCV
- NumPy

### Dispositivo

- MQTT
- Mosquitto
- Simulador de ESP32 con Node.js

## Estructura del proyecto

```text
practicas/
├── app/                    # Microservicio FastAPI
├── backend-node/           # API principal y lógica de negocio
├── dataset/                # Dataset del modelo
├── documentacion/          # Documentación técnica
├── esp32-simulator/        # Simulador MQTT del dispositivo
├── flutter-app/            # Aplicación Flutter
├── imagenes_reales/        # Imágenes para pruebas
├── modelo/                 # Modelo entrenado y clases
├── notebooks/              # Entrenamiento y análisis
├── pruebas/                # Pruebas del microservicio de IA
├── util/                   # Utilidades de inferencia
├── requirements.txt
└── README.md
```

## Requisitos

Antes de iniciar el proyecto se necesita:

- Python compatible con las dependencias del proyecto.
- Node.js y npm.
- Flutter SDK.
- PostgreSQL.
- Mosquitto MQTT.
- Google Chrome para Flutter Web.
- Una cuenta Gmail con verificación en dos pasos.
- Una contraseña de aplicación de Google.

## Variables de entorno

Nunca se deben publicar archivos `.env` ni contraseñas reales.

### Backend Node

Copia el archivo de ejemplo:

```powershell
cd backend-node
Copy-Item .env.example .env
```

Configura:

```env
PORT=3000
NODE_ENV=development

AI_API_URL=http://127.0.0.1:8000
AI_API_TIMEOUT_MS=30000
CORS_ORIGIN=*

DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/reciclaje_inteligente?schema=public"

JWT_SECRET=una_clave_privada_de_al_menos_32_caracteres
JWT_EXPIRES_IN=8h
DEVICE_API_KEY=otra_clave_privada_de_al_menos_32_caracteres

MQTT_URL=mqtt://127.0.0.1:1883
MQTT_DEVICE_ID=bin-01

SMTP_USER=correo_emisor@gmail.com
SMTP_PASS=contraseña_de_aplicacion_de_google
SMTP_FROM_NAME=SmartBin
EMAIL_VERIFICATION_EXPIRES_MINUTES=10
```

### Simulador ESP32

Copia el archivo de ejemplo:

```powershell
cd esp32-simulator
Copy-Item .env.example .env
```

Configura:

```env
MQTT_URL=mqtt://127.0.0.1:1883
MQTT_DEVICE_ID=bin-01
SIMULATION_DELAY_MS=3000
AUTO_CONFIRM=true
```

## Instalación

### 1. Microservicio de inteligencia artificial

Desde la raíz:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

El modelo debe existir en:

```text
modelo/modelo_residuos.keras
```

Y las clases en:

```text
modelo/clases.json
```

### 2. Backend Node.js

```powershell
cd backend-node
npm install
npx prisma generate
npx prisma migrate deploy
```

### 3. Simulador ESP32

```powershell
cd esp32-simulator
npm install
```

### 4. Aplicación Flutter

```powershell
cd flutter-app
flutter pub get
```

## Ejecución del sistema

Cada servicio debe ejecutarse en una terminal diferente.

### Terminal 1 — Broker MQTT

```powershell
mosquitto -v
```

Puerto esperado:

```text
1883
```

### Terminal 2 — Inteligencia artificial

Desde la raíz del proyecto:

```powershell
python -m uvicorn app.api.main:app --reload --host 127.0.0.1 --port 8000
```

Documentación interactiva:

```text
http://127.0.0.1:8000/docs
```

### Terminal 3 — Backend Node

```powershell
cd backend-node
npm run dev
```

Dirección:

```text
http://127.0.0.1:3000
```

### Terminal 4 — Simulador ESP32

```powershell
cd esp32-simulator
npm run dev
```

### Terminal 5 — Flutter Web

```powershell
cd flutter-app
flutter run -d chrome
```

Chrome solicitará permiso para utilizar la cámara. Debe seleccionarse **Permitir**.

## Flujo de funcionamiento

1. El usuario crea una cuenta.
2. SmartBin envía un código al correo registrado.
3. El usuario verifica el correo.
4. Inicia sesión y recibe un token JWT.
5. Abre la pantalla de clasificación.
6. Captura automáticamente una fotografía o utiliza la galería.
7. Flutter envía la imagen al backend.
8. El backend consulta el microservicio de inteligencia artificial.
9. EfficientNetB0 identifica el residuo.
10. El backend registra un depósito pendiente.
11. Se publica una orden MQTT.
12. El dispositivo abre el compartimento correspondiente.
13. El sensor simulado confirma el depósito.
14. El backend acredita los puntos.
15. Flutter muestra los puntos y el historial actualizado.

## Rutas principales

### Backend Node.js

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/auth/register` | Registrar usuario |
| POST | `/api/v1/auth/verify-email` | Verificar correo |
| POST | `/api/v1/auth/resend-verification` | Reenviar código |
| POST | `/api/v1/auth/login` | Iniciar sesión |
| GET | `/api/v1/auth/me` | Consultar perfil |
| POST | `/api/v1/deposits/predict` | Clasificar imagen |
| GET | `/api/v1/deposits` | Consultar historial |
| GET | `/api/v1/health` | Estado del backend |

### Microservicio FastAPI

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/health` | Estado del modelo |
| POST | `/api/v1/predict` | Clasificar una imagen |
| GET | `/docs` | Documentación OpenAPI |

## Tópicos MQTT

Orden para abrir el compartimento:

```text
smartbin/bin-01/commands/open
```

Confirmación del depósito:

```text
smartbin/bin-01/events/deposit-confirmed
```

## Pruebas

### Inteligencia artificial

Desde la raíz:

```powershell
python -m pytest pruebas -q
```

### Backend Node

```powershell
cd backend-node
npm test
```

Resultado validado:

```text
tests 25
pass 25
fail 0
```

### Flutter

```powershell
cd flutter-app
flutter analyze
flutter test
```

Resultado validado:

```text
2 tests passed
```

### Simulador ESP32

Primero deja el simulador activo:

```powershell
cd esp32-simulator
npm run dev
```

En otra terminal:

```powershell
cd esp32-simulator
npm test
```

Resultado validado:

```text
tests 2
pass 2
fail 0
```

## Seguridad

- Las contraseñas se almacenan mediante hashes bcrypt.
- Los endpoints privados requieren JWT.
- El correo debe verificarse antes del inicio de sesión.
- Los códigos tienen tiempo de expiración.
- Los códigos se almacenan protegidos mediante HMAC.
- Las credenciales SMTP permanecen en `.env`.
- El dispositivo utiliza una clave independiente.
- Las imágenes tienen validación de formato y tamaño.
- Las respuestas públicas no incluyen `passwordHash`.
- Los secretos no deben añadirse al repositorio.

## Consideraciones

- Flutter Web necesita acceso a la cámara desde `localhost` o mediante HTTPS.
- En Android Emulator, Flutter utiliza `10.0.2.2` para comunicarse con el computador.
- PostgreSQL, Mosquitto, FastAPI y Node deben estar activos.
- La primera inferencia puede tardar más mientras TensorFlow carga el modelo.
- Gmail SMTP se utiliza para fines académicos y de demostración.
- Para producción se recomienda un proveedor transaccional de correo.

## Estado del proyecto

El prototipo integra correctamente:

- Aplicación Flutter.
- Captura automática.
- Clasificación con EfficientNetB0.
- Backend principal.
- PostgreSQL.
- Autenticación y verificación de correo.
- Comunicación MQTT.
- Simulador ESP32.
- Historial y puntos.
- Pruebas automatizadas.

## Autor

Proyecto académico de sistema inteligente de reciclaje SmartBin.