"""
Migração: SQLite local → PostgreSQL (Neon)
Uso: python migrate.py <DATABASE_URL_DO_NEON>
"""
import sys
import sqlite3
import psycopg2

if len(sys.argv) < 2:
    print("Uso: python migrate.py postgresql://user:pass@host/db")
    sys.exit(1)

PG_URL = sys.argv[1].replace("postgres://", "postgresql://", 1)

# Lê do SQLite
sqlite = sqlite3.connect("financeiro.db")
sqlite.row_factory = sqlite3.Row

transacoes = sqlite.execute("SELECT * FROM transacao").fetchall()
configs    = sqlite.execute("SELECT * FROM config").fetchall()
sqlite.close()

print(f"Encontrado: {len(transacoes)} transações, {len(configs)} configurações")

# Escreve no PostgreSQL
pg = psycopg2.connect(PG_URL)
cur = pg.cursor()

# Garante que as tabelas existem
cur.execute("""
    CREATE TABLE IF NOT EXISTS transacao (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        valor FLOAT NOT NULL,
        descricao TEXT,
        recorrente BOOLEAN NOT NULL DEFAULT FALSE
    )
""")
cur.execute("""
    CREATE TABLE IF NOT EXISTS config (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
    )
""")

# Insere transações
for t in transacoes:
    cur.execute("""
        INSERT INTO transacao (id, data, mes, ano, tipo, valor, descricao, recorrente)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """, (t["id"], t["data"], t["mes"], t["ano"], t["tipo"], t["valor"], t["descricao"], bool(t["recorrente"])))

# Atualiza sequence do id após inserção com ids explícitos
cur.execute("SELECT setval('transacao_id_seq', (SELECT MAX(id) FROM transacao))")

# Insere configs
for c in configs:
    cur.execute("""
        INSERT INTO config (chave, valor) VALUES (%s, %s)
        ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
    """, (c["chave"], c["valor"]))

pg.commit()
cur.close()
pg.close()

print("Migração concluída com sucesso!")
