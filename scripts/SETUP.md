# Configurando o Importador de Recibos no GitHub Actions

O workflow `verificar-recibos.yml` roda automaticamente a cada 30 minutos e precisa de 5 Secrets configurados no repositório.

## 1. Acesse as configurações de Secrets

No GitHub:  
**Settings → Secrets and variables → Actions → New repository secret**

---

## 2. Secrets a criar

### `GMAIL_CREDENTIALS_JSON`
Conteúdo completo do arquivo `C:\Users\jhona\.gmail-mcp\credentials.json` da sua máquina local.

```
# No PowerShell:
Get-Content "$env:USERPROFILE\.gmail-mcp\credentials.json" | clip
```
Cole o conteúdo copiado como valor do Secret.

---

### `GMAIL_OAUTH_KEYS_JSON`
Conteúdo completo do arquivo `C:\Users\jhona\.gmail-mcp\gcp-oauth.keys.json`.

```
# No PowerShell:
Get-Content "$env:USERPROFILE\.gmail-mcp\gcp-oauth.keys.json" | clip
```

---

### `APP_PASSWORD`
Senha do backend (a mesma usada para login no app).

---

### `MY_EMAIL`
Seu endereço Gmail: `jhonalvarezskate@gmail.com`

---

### `BACKEND_URL`
URL do backend no Render: `https://controle-financeiro-kk70.onrender.com`

---

## 3. Testando manualmente

Após criar os Secrets, teste antes de esperar o cron:

1. Acesse **Actions → Verificar Recibos**
2. Clique em **Run workflow → Run workflow**
3. Acompanhe os logs em tempo real

**Primeira execução**: vai baixar os modelos do EasyOCR (~500MB) — leva ~3 min.  
**Execuções seguintes**: usa o cache — menos de 1 min se não houver emails.

---

## 4. Verificando que funciona

1. Envie um email de `jhonalvarezskate@gmail.com` para você mesmo com uma foto de recibo em anexo
2. Rode o workflow manualmente
3. Verifique se a transação apareceu no app

---

## 5. Após confirmar que está funcionando

Você pode desabilitar o Task Scheduler do Windows:

**Task Scheduler → ImportadorRecibos → Disable**

O script local (`C:\Users\jhona\gmail_recibos\gmail_recibos.py`) continua funcionando normalmente para execuções manuais se necessário.
