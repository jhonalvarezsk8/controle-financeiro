#!/usr/bin/env python3
"""
Importador automático de recibos via Gmail.
Busca e-mails não lidos com fotos de recibos, extrai os dados
via EasyOCR (local, gratuito) e cria transações no app de controle financeiro.

Roda localmente (Task Scheduler) ou na nuvem (GitHub Actions).
Em Actions, lê credenciais de variáveis de ambiente.
Localmente, lê dos arquivos ~/.gmail-mcp/ como antes.
"""

import os
import sys
import json
import base64
import re
import requests
import io
import traceback
import warnings
import numpy as np
from pathlib import Path
from datetime import datetime

warnings.filterwarnings("ignore")

# Fix Windows console encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import easyocr
import cv2
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

# ── Configuração ─────────────────────────────────────────────────────────────
# Lê de variáveis de ambiente (GitHub Actions) com fallback para valores locais
BACKEND_URL  = os.environ.get("BACKEND_URL",  "https://controle-financeiro-kk70.onrender.com")
APP_PASSWORD = os.environ.get("APP_PASSWORD", "senha123")
MY_EMAIL     = os.environ.get("MY_EMAIL",     "jhonalvarezskate@gmail.com")

# Caminhos locais (usados apenas quando não há env vars — execução local)
CREDENTIALS_PATH = Path.home() / ".gmail-mcp" / "credentials.json"
OAUTH_KEYS_PATH  = Path.home() / ".gmail-mcp" / "gcp-oauth.keys.json"

# EasyOCR — inicializado uma vez (baixa modelos na 1ª execução ~500MB)
_ocr_reader = None
def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        print("  Carregando modelo OCR (só na primeira vez)...")
        _ocr_reader = easyocr.Reader(["pt", "en"], gpu=False, verbose=False)
    return _ocr_reader
# ─────────────────────────────────────────────────────────────────────────────


def get_gmail_service():
    # Em GitHub Actions, credenciais vêm de env vars (JSON como string)
    # Localmente, lê dos arquivos ~/.gmail-mcp/
    cred_json = os.environ.get("GMAIL_CREDENTIALS_JSON")
    keys_json = os.environ.get("GMAIL_OAUTH_KEYS_JSON")

    if cred_json and keys_json:
        cred_data = json.loads(cred_json)
        keys = json.loads(keys_json)
    else:
        with open(CREDENTIALS_PATH) as f:
            cred_data = json.load(f)
        with open(OAUTH_KEYS_PATH) as f:
            keys = json.load(f)

    installed = keys.get("installed", keys.get("web", {}))

    creds = Credentials(
        token=cred_data["access_token"],
        refresh_token=cred_data["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=installed["client_id"],
        client_secret=installed["client_secret"],
        scopes=cred_data["scope"].split(),
    )

    if creds.expired:
        creds.refresh(Request())
        # Persiste o token renovado apenas na execução local (arquivo existe)
        # Em Actions o arquivo é efêmero — não há como salvar de volta no Secret
        if not cred_json:
            cred_data["access_token"] = creds.token
            with open(CREDENTIALS_PATH, "w") as f:
                json.dump(cred_data, f)

    return build("gmail", "v1", credentials=creds)


def get_unread_emails(service):
    query = f"from:{MY_EMAIL} to:{MY_EMAIL} has:attachment is:unread"
    result = service.users().messages().list(userId="me", q=query).execute()
    return result.get("messages", [])


def download_image_attachments(service, message_id):
    message = service.users().messages().get(userId="me", id=message_id).execute()
    attachments = []

    # Extrair assunto do e-mail
    headers = message["payload"].get("headers", [])
    subject = next((h["value"] for h in headers if h["name"].lower() == "subject"), "")

    def extract_parts(parts):
        for part in parts:
            if "parts" in part:
                extract_parts(part["parts"])
            elif part.get("filename") and part["mimeType"].startswith("image/"):
                att_id = part["body"].get("attachmentId")
                if att_id:
                    att = service.users().messages().attachments().get(
                        userId="me", messageId=message_id, id=att_id
                    ).execute()
                    attachments.append(base64.urlsafe_b64decode(att["data"]))

    payload = message["payload"]
    if "parts" in payload:
        extract_parts(payload["parts"])

    return attachments, subject


def preprocess_image(img_array):
    """Binarização adaptativa via OpenCV — ideal para recibos impressos."""
    # Converte para escala de cinza
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

    # Upscale se necessário (EasyOCR performa melhor com texto maior)
    h, w = gray.shape
    if max(w, h) < 1800:
        scale = 1800 / max(w, h)
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    # Binarização adaptativa: transforma em preto/branco limpo
    # Ideal para recibos com fundo levemente cinza ou iluminação irregular
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31, C=15
    )

    # Converte de volta para RGB (EasyOCR espera 3 canais)
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)


def ocr_to_text(reader, img_array):
    """Tenta extrair texto com paragraph=False, depois paragraph=True se resultado for ruim."""
    results = reader.readtext(img_array, detail=0, paragraph=False)
    lines = [t.strip() for t in results if t.strip()]

    # Se o resultado parecer fragmentado (muitas linhas com 1-2 chars), tenta paragraph=True
    avg_len = sum(len(l) for l in lines) / max(len(lines), 1)
    if avg_len < 4 and len(lines) > 10:
        print("  OCR fragmentado, tentando modo parágrafo...")
        results2 = reader.readtext(img_array, detail=0, paragraph=True)
        lines2 = [t.strip() for t in results2 if t.strip()]
        if sum(len(l) for l in lines2) > sum(len(l) for l in lines):
            lines = lines2

    return "\n".join(lines)


def extract_transaction(image_data):
    """Extrai dados do recibo usando EasyOCR + parsing de texto."""
    today = datetime.now().strftime("%Y-%m-%d")

    # Converter imagem — aplica rotação EXIF antes de qualquer coisa
    # Fotos de celular têm metadado EXIF de orientação que o PIL ignora por padrão;
    # sem isso o EasyOCR recebe a imagem de lado e não consegue ler o texto.
    image = Image.open(io.BytesIO(image_data))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")
    img_array = preprocess_image(np.array(image))

    # Extrair texto via OCR
    reader = get_ocr_reader()
    full_text = ocr_to_text(reader, img_array)
    text_lines = [l for l in full_text.splitlines() if l.strip()]
    print(f"  OCR extraiu {len(text_lines)} linhas. Preview: {text_lines[:5]}")

    # ── Extrair VALOR ──────────────────────────────────────────────────────
    valor = None

    # 1) Linha com TOTAL/VALOR seguida de número
    total_pattern = re.compile(
        r'(?:total|valor\s*total|a\s*pagar|subtotal)[^\d]*(\d{1,6}[.,]\d{2})',
        re.IGNORECASE
    )
    m = total_pattern.search(full_text)
    if m:
        valor = float(m.group(1).replace(",", "."))

    # 2) "R$" seguido de número
    if valor is None:
        rs_pattern = re.compile(r'R\$\s*(\d{1,6}[.,]\d{2})', re.IGNORECASE)
        matches = rs_pattern.findall(full_text)
        if matches:
            valor = max(float(v.replace(",", ".")) for v in matches)

    # 3) Maior número decimal no texto (fallback)
    if valor is None:
        nums = re.findall(r'\b(\d{1,6}[.,]\d{2})\b', full_text)
        if nums:
            valor = max(float(n.replace(",", ".")) for n in nums)

    if valor is None:
        raise ValueError(f"Valor não encontrado no recibo. Texto extraído:\n{full_text}")

    # ── Extrair DATA ───────────────────────────────────────────────────────
    MESES_PT = {
        'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
        'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
    }

    data = today
    date_patterns = [
        (r'\b(\d{2})/(\d{2})/(\d{4})\b', lambda m: f"{m.group(3)}-{m.group(2)}-{m.group(1)}"),
        (r'\b(\d{4})-(\d{2})-(\d{2})\b', lambda m: m.group(0)),
        (r'\b(\d{2})-(\d{2})-(\d{4})\b', lambda m: f"{m.group(3)}-{m.group(2)}-{m.group(1)}"),
        (r'\b(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})\b', lambda m: (
            f"{m.group(3)}-{MESES_PT.get(m.group(2).lower(), '01')}-{m.group(1).zfill(2)}"
            if m.group(2).lower() in MESES_PT else None
        )),
    ]
    for pat, fmt in date_patterns:
        m = re.search(pat, full_text)
        if m:
            resultado = fmt(m)
            if resultado:
                data = resultado
                break

    # ── Extrair DESCRIÇÃO ──────────────────────────────────────────────────
    # Pega as primeiras linhas não-numéricas como nome do estabelecimento
    descricao = "Recibo"
    for line in text_lines[:5]:
        if len(line) > 3 and not re.match(r'^[\d\s.,/:-]+$', line):
            descricao = line[:50]
            break

    # ── Inferir TIPO ───────────────────────────────────────────────────────
    tipo = "saida"
    entrada_keywords = re.compile(r'\b(pix\s+recebido|deposito|credito|recebimento|entrada)\b', re.IGNORECASE)
    if entrada_keywords.search(full_text):
        tipo = "entrada"

    return {"valor": valor, "data": data, "tipo": tipo, "descricao": descricao}


def get_backend_token():
    # Render free tier pode demorar ~60s para acordar
    r = requests.post(f"{BACKEND_URL}/login", json={"senha": APP_PASSWORD}, timeout=90)
    r.raise_for_status()
    return r.json()["access_token"]


def create_transaction(token, data, retries=3, retry_delay=10):
    import time
    last_error = None
    for attempt in range(1, retries + 1):
        r = requests.post(
            f"{BACKEND_URL}/transacoes",
            json={**data, "recorrente": False},
            headers={"Authorization": f"Bearer {token}"},
            timeout=90,
        )
        if r.ok:
            return r.json()
        last_error = f"{r.status_code} {r.reason} — resposta: {r.text[:300]}"
        if r.status_code == 500 and attempt < retries:
            print(f"  Tentativa {attempt}/{retries} falhou (500). Aguardando {retry_delay}s...")
            time.sleep(retry_delay)
        else:
            break
    raise ValueError(last_error)


def mark_as_read(service, message_id):
    service.users().messages().modify(
        userId="me", id=message_id, body={"removeLabelIds": ["UNREAD"]}
    ).execute()


def main():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] Verificando e-mails de recibos...")

    service = get_gmail_service()
    messages = get_unread_emails(service)

    if not messages:
        print("Nenhum e-mail novo encontrado.")
        return

    print(f"{len(messages)} e-mail(s) encontrado(s).")
    token = get_backend_token()
    created = 0

    for msg in messages:
        try:
            attachments, subject = download_image_attachments(service, msg["id"])
            if not attachments:
                mark_as_read(service, msg["id"])
                continue

            # Assunto "Entrada" força tipo entrada; sem assunto mantém lógica do OCR
            tipo_forcado = "entrada" if subject.strip().lower() == "entrada" else None

            email_ok = True
            for img_data in attachments:
                try:
                    data = extract_transaction(img_data)
                    transaction = {
                        "data": data["data"],
                        "tipo": tipo_forcado if tipo_forcado else data["tipo"],
                        "valor": float(data["valor"]),
                        "descricao": str(data["descricao"])[:50],
                    }
                    print(f"  → enviando: {transaction}")
                    create_transaction(token, transaction)
                    print(f"  ✓ {transaction['descricao']} — R$ {transaction['valor']} ({transaction['data']})")
                    created += 1
                except Exception as e:
                    print(f"  Erro ao processar imagem: {e}")
                    traceback.print_exc()
                    email_ok = False

            if email_ok:
                mark_as_read(service, msg["id"])

        except Exception as e:
            print(f"  Erro no e-mail {msg['id']}: {e}")

    print(f"Concluído. {created} transação(ões) criada(s).")


if __name__ == "__main__":
    main()
