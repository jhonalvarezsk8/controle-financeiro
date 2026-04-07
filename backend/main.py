import os
import secrets
import calendar
from datetime import date, datetime, timedelta
from typing import List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt

import models
import schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Controle Financeiro")

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173"
).split(",")

APP_PASSWORD = os.getenv("APP_PASSWORD", "")
JWT_SECRET = os.getenv("JWT_SECRET", "changeme")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30
bearer_scheme = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── auth ─────────────────────────────────────────────────────────────────────

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    try:
        jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


@app.post("/login")
def login(body: dict):
    senha = body.get("senha", "")
    if not APP_PASSWORD:
        raise HTTPException(status_code=500, detail="APP_PASSWORD não configurado")
    if not secrets.compare_digest(senha, APP_PASSWORD):
        raise HTTPException(status_code=401, detail="Senha incorreta")
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    token = jwt.encode({"sub": "user", "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}


# ── helpers ──────────────────────────────────────────────────────────────────

def get_saldo_inicial(db: Session) -> float:
    cfg = db.query(models.Config).filter(models.Config.chave == "saldo_inicial").first()
    return float(cfg.valor) if cfg else 0.0


def calcular_saldo_ate(db: Session, ate: date) -> float:
    """Retorna saldo_inicial + todas as entradas - todas as saídas até 'ate' (inclusive)."""
    saldo = get_saldo_inicial(db)
    transacoes = (
        db.query(models.Transacao)
        .filter(models.Transacao.data <= ate)
        .all()
    )
    for t in transacoes:
        if t.tipo == "entrada":
            saldo += t.valor
        else:
            saldo -= t.valor
    return saldo


# ── config ────────────────────────────────────────────────────────────────────

@app.get("/config/saldo_inicial")
def ler_saldo_inicial(db: Session = Depends(get_db), _=Depends(verify_token)):
    return {"valor": get_saldo_inicial(db)}


@app.put("/config/saldo_inicial")
def definir_saldo_inicial(body: dict, db: Session = Depends(get_db), _=Depends(verify_token)):
    valor = str(body.get("valor", 0))
    cfg = db.query(models.Config).filter(models.Config.chave == "saldo_inicial").first()
    if cfg:
        cfg.valor = valor
    else:
        db.add(models.Config(chave="saldo_inicial", valor=valor))
    db.commit()
    return {"valor": float(valor)}


# ── transações ───────────────────────────────────────────────────────────────

@app.get("/transacoes/{ano}/{mes}/{dia}", response_model=List[schemas.TransacaoOut])
def listar_transacoes_dia(ano: int, mes: int, dia: int, db: Session = Depends(get_db), _=Depends(verify_token)):
    d = date(ano, mes, dia)
    return (
        db.query(models.Transacao)
        .filter(models.Transacao.data == d)
        .order_by(models.Transacao.id)
        .all()
    )


@app.post("/transacoes", response_model=schemas.TransacaoOut, status_code=201)
def criar_transacao(dados: schemas.TransacaoCreate, db: Session = Depends(get_db), _=Depends(verify_token)):
    if dados.tipo not in ("entrada", "saida"):
        raise HTTPException(status_code=400, detail="tipo deve ser 'entrada' ou 'saida'")

    # Transação principal
    t = models.Transacao(
        data=dados.data,
        mes=dados.data.month,
        ano=dados.data.year,
        tipo=dados.tipo,
        valor=dados.valor,
        descricao=dados.descricao,
        recorrente=dados.recorrente,
    )
    db.add(t)

    # Se recorrente, cria cópias independentes nos meses restantes do mesmo ano
    if dados.recorrente:
        dia = dados.data.day
        ano = dados.data.year
        for mes_futuro in range(dados.data.month + 1, 13):
            # Verifica se o dia existe no mês futuro
            max_dia = calendar.monthrange(ano, mes_futuro)[1]
            if dia > max_dia:
                continue  # pula meses onde o dia não existe (ex: dia 31 em fevereiro)
            copia = models.Transacao(
                data=date(ano, mes_futuro, dia),
                mes=mes_futuro,
                ano=ano,
                tipo=dados.tipo,
                valor=dados.valor,
                descricao=dados.descricao,
                recorrente=False,  # cópias são independentes
            )
            db.add(copia)

    db.commit()
    db.refresh(t)
    return t


@app.put("/transacoes/{id}", response_model=schemas.TransacaoOut)
def editar_transacao(id: int, dados: schemas.TransacaoUpdate, db: Session = Depends(get_db), _=Depends(verify_token)):
    t = db.query(models.Transacao).filter(models.Transacao.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(t, campo, valor)
    db.commit()
    db.refresh(t)
    return t


@app.delete("/transacoes/{id}", status_code=204)
def excluir_transacao(id: int, db: Session = Depends(get_db), _=Depends(verify_token)):
    t = db.query(models.Transacao).filter(models.Transacao.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    db.delete(t)
    db.commit()


# ── dias do mês ───────────────────────────────────────────────────────────────

@app.get("/dias/{ano}/{mes}", response_model=List[schemas.DiaResumo])
def dias_do_mes(ano: int, mes: int, db: Session = Depends(get_db), _=Depends(verify_token)):
    hoje = date.today()
    total_dias = calendar.monthrange(ano, mes)[1]

    # Busca todas as transações do mês de uma vez
    transacoes_mes = (
        db.query(models.Transacao)
        .filter(models.Transacao.ano == ano, models.Transacao.mes == mes)
        .all()
    )

    # Agrupa por dia
    por_dia: dict[int, dict] = {}
    for t in transacoes_mes:
        d = t.data.day
        if d not in por_dia:
            por_dia[d] = {"entradas": 0.0, "saidas": 0.0}
        if t.tipo == "entrada":
            por_dia[d]["entradas"] += t.valor
        else:
            por_dia[d]["saidas"] += t.valor

    # Calcula saldo acumulado até o dia anterior ao mês
    primeiro_dia = date(ano, mes, 1)
    dia_anterior = date(ano, mes, 1).replace(day=1)
    # saldo até o último dia do mês anterior
    from datetime import timedelta
    dia_antes_do_mes = primeiro_dia - timedelta(days=1)
    saldo_acumulado = calcular_saldo_ate(db, dia_antes_do_mes)

    resultado = []
    for dia in range(1, total_dias + 1):
        d = date(ano, mes, dia)
        entradas = por_dia.get(dia, {}).get("entradas", 0.0)
        saidas = por_dia.get(dia, {}).get("saidas", 0.0)
        saldo_acumulado = saldo_acumulado + entradas - saidas

        resultado.append(schemas.DiaResumo(
            dia=dia,
            data=d,
            entradas=entradas,
            saidas=saidas,
            saldo=saldo_acumulado,
            is_future=d > hoje,
            has_transactions=dia in por_dia,
        ))

    return resultado


# ── resumo anual ──────────────────────────────────────────────────────────────

@app.get("/resumo/{ano}", response_model=List[schemas.ResumoMes])
def resumo_anual(ano: int, db: Session = Depends(get_db), _=Depends(verify_token)):
    hoje = date.today()
    resultado = []

    # Saldo acumulado começa do saldo_inicial
    saldo = get_saldo_inicial(db)

    for mes in range(1, 13):
        transacoes = (
            db.query(models.Transacao)
            .filter(models.Transacao.ano == ano, models.Transacao.mes == mes)
            .all()
        )
        total_entradas = sum(t.valor for t in transacoes if t.tipo == "entrada")
        total_saidas = sum(t.valor for t in transacoes if t.tipo == "saida")
        saldo += total_entradas - total_saidas

        resultado.append(schemas.ResumoMes(
            mes=mes,
            ano=ano,
            total_entradas=total_entradas,
            total_saidas=total_saidas,
            performance=total_entradas - total_saidas,
            saldo_final=saldo,
        ))

    return resultado


# ── saldo atual ───────────────────────────────────────────────────────────────

@app.get("/saldo_atual")
def saldo_atual(db: Session = Depends(get_db), _=Depends(verify_token)):
    hoje = date.today()
    saldo = calcular_saldo_ate(db, hoje)
    return {"saldo": saldo, "data": hoje.isoformat()}
