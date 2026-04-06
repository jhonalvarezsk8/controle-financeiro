from pydantic import BaseModel
from datetime import date
from typing import Optional


class LancamentoBase(BaseModel):
    data: date
    entrada: Optional[float] = None
    saida: Optional[float] = None
    diario: Optional[float] = None
    saldo: Optional[float] = None


class LancamentoCreate(LancamentoBase):
    pass


class LancamentoUpdate(BaseModel):
    entrada: Optional[float] = None
    saida: Optional[float] = None
    diario: Optional[float] = None
    saldo: Optional[float] = None


class LancamentoOut(LancamentoBase):
    id: int
    mes: int
    ano: int

    model_config = {"from_attributes": True}


class ResumoMes(BaseModel):
    mes: int
    ano: int
    total_entradas: float
    total_saidas: float
    total_diario: float
    saida_total: float
    performance: float
    saldo_final: Optional[float]
