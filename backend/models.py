from sqlalchemy import Column, Integer, Float, Date, Text, Boolean
from database import Base


class Transacao(Base):
    __tablename__ = "transacao"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    tipo = Column(Text, nullable=False)   # 'entrada' | 'saida'
    valor = Column(Float, nullable=False)
    descricao = Column(Text, nullable=True)
    recorrente = Column(Boolean, nullable=False, default=False)


class Config(Base):
    __tablename__ = "config"

    chave = Column(Text, primary_key=True)
    valor = Column(Text, nullable=False)
