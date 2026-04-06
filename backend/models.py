from sqlalchemy import Column, Integer, Float, Date
from database import Base


class Lancamento(Base):
    __tablename__ = "lancamentos"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    entrada = Column(Float, nullable=True)
    saida = Column(Float, nullable=True)
    diario = Column(Float, nullable=True)
    saldo = Column(Float, nullable=True)
