from pydantic import BaseModel
from datetime import date
from typing import Optional


class TransacaoCreate(BaseModel):
    data: date
    tipo: str   # 'entrada' | 'saida'
    valor: float
    descricao: Optional[str] = None
    recorrente: bool = False


class TransacaoUpdate(BaseModel):
    tipo: Optional[str] = None
    valor: Optional[float] = None
    descricao: Optional[str] = None


class TransacaoOut(BaseModel):
    id: int
    data: date
    mes: int
    ano: int
    tipo: str
    valor: float
    descricao: Optional[str]
    recorrente: bool

    model_config = {"from_attributes": True}


class DiaResumo(BaseModel):
    dia: int
    data: date
    entradas: float
    saidas: float
    saldo: float
    is_future: bool
    has_transactions: bool


class ResumoMes(BaseModel):
    mes: int
    ano: int
    total_entradas: float
    total_saidas: float
    performance: float
    saldo_final: float
