import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Controle Financeiro")

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/lancamentos", response_model=List[schemas.LancamentoOut])
def listar_todos(db: Session = Depends(get_db)):
    return db.query(models.Lancamento).order_by(models.Lancamento.data).all()


@app.get("/lancamentos/mes/{ano}/{mes}", response_model=List[schemas.LancamentoOut])
def listar_por_mes(ano: int, mes: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Lancamento)
        .filter(models.Lancamento.ano == ano, models.Lancamento.mes == mes)
        .order_by(models.Lancamento.data)
        .all()
    )


@app.post("/lancamentos", response_model=schemas.LancamentoOut, status_code=201)
def criar(lancamento: schemas.LancamentoCreate, db: Session = Depends(get_db)):
    db_item = models.Lancamento(
        data=lancamento.data,
        mes=lancamento.data.month,
        ano=lancamento.data.year,
        entrada=lancamento.entrada,
        saida=lancamento.saida,
        diario=lancamento.diario,
        saldo=lancamento.saldo,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.put("/lancamentos/{id}", response_model=schemas.LancamentoOut)
def editar(id: int, dados: schemas.LancamentoUpdate, db: Session = Depends(get_db)):
    item = db.query(models.Lancamento).filter(models.Lancamento.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/lancamentos/{id}", status_code=204)
def excluir(id: int, db: Session = Depends(get_db)):
    item = db.query(models.Lancamento).filter(models.Lancamento.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    db.delete(item)
    db.commit()


@app.get("/resumo/{ano}", response_model=List[schemas.ResumoMes])
def resumo_anual(ano: int, db: Session = Depends(get_db)):
    resultado = []
    for mes in range(1, 13):
        registros = (
            db.query(models.Lancamento)
            .filter(models.Lancamento.ano == ano, models.Lancamento.mes == mes)
            .all()
        )
        total_entradas = sum(r.entrada or 0 for r in registros)
        total_saidas = sum(r.saida or 0 for r in registros)
        total_diario = sum(r.diario or 0 for r in registros)
        saida_total = total_saidas + total_diario
        performance = total_entradas - saida_total
        ultimo = max((r for r in registros if r.saldo is not None), key=lambda r: r.data, default=None)
        resultado.append(
            schemas.ResumoMes(
                mes=mes,
                ano=ano,
                total_entradas=total_entradas,
                total_saidas=total_saidas,
                total_diario=total_diario,
                saida_total=saida_total,
                performance=performance,
                saldo_final=ultimo.saldo if ultimo else None,
            )
        )
    return resultado
