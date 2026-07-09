from util.inferencia import InferenciaTiempoReal

motor = InferenciaTiempoReal(
    "modelo/modelo_residuos.keras",
    "modelo/clases.json"
)

print("\nMotor creado correctamente.")