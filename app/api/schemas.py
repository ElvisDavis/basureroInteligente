from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class ModeloInformacion(BaseModel):
    name: str
    version: str
    class_count: int
    classes: list[str]


class PrediccionDetalle(BaseModel):
    """
    Resultado principal de la clasificación
    El atributo interno se llama clase name pero en JOSN se mostrara como claa
    """
    model_config = ConfigDict(populate_by_name = True)

    class_name: str = Field(alias = "class")
    #Confianza en escal adecimal
    confidence: float = Field(ge = 0.0, le = 1.0,)

    #Confianza expresada como porcentaje 0 a 100
    confidence_percent: float = Field(ge = 0.0, le=100.0,)

class PrediccionRanking(BaseModel):
    model_config = ConfigDict(populate_by_name = True)

    class_name: str = Field(alias="class")
    confidence: float = Field(ge=0.00, le=1.0)

class PrediccionRespuesta(BaseModel):
    success: bool= True
    prediction_id: str
    prediction: PrediccionDetalle
    top_predictions: list[PrediccionRanking]
    model: ModeloInformacion
    timestamp: datetime

class EstadoModelo(BaseModel):
    loaded: bool
    name: str
    version: str
    input_shape: list[int]
    classes: list[str]

class HealthRespuesta(BaseModel):
    success: bool = True
    status:str
    model: EstadoModelo
    timestamp: datetime



