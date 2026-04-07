const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return new Promise(() => {});
  }
  return res;
}

export async function login(senha: string): Promise<void> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senha }),
  });
  if (!res.ok) throw new Error("Senha incorreta");
  const data = await res.json();
  localStorage.setItem("token", data.access_token);
}

export interface Transacao {
  id: number;
  data: string;
  mes: number;
  ano: number;
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string | null;
  recorrente: boolean;
}

export interface TransacaoCreate {
  data: string;
  tipo: "entrada" | "saida";
  valor: number;
  descricao?: string | null;
  recorrente?: boolean;
}

export interface TransacaoUpdate {
  tipo?: "entrada" | "saida";
  valor?: number;
  descricao?: string | null;
}

export interface DiaResumo {
  dia: number;
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
  is_future: boolean;
  has_transactions: boolean;
}

export interface ResumoMes {
  mes: number;
  ano: number;
  total_entradas: number;
  total_saidas: number;
  performance: number;
  saldo_final: number;
}

// ── transações ────────────────────────────────────────────────────────────────

export async function getTransacoesDia(ano: number, mes: number, dia: number): Promise<Transacao[]> {
  const res = await apiFetch(`${BASE}/transacoes/${ano}/${mes}/${dia}`, { headers: authHeaders() });
  return res.json();
}

export async function criarTransacao(dados: TransacaoCreate): Promise<Transacao> {
  const res = await apiFetch(`${BASE}/transacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(dados),
  });
  return res.json();
}

export async function editarTransacao(id: number, dados: TransacaoUpdate): Promise<Transacao> {
  const res = await apiFetch(`${BASE}/transacoes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(dados),
  });
  return res.json();
}

export async function excluirTransacao(id: number): Promise<void> {
  await apiFetch(`${BASE}/transacoes/${id}`, { method: "DELETE", headers: authHeaders() });
}

// ── dias e resumos ────────────────────────────────────────────────────────────

export async function getDiasMes(ano: number, mes: number): Promise<DiaResumo[]> {
  const res = await apiFetch(`${BASE}/dias/${ano}/${mes}`, { headers: authHeaders() });
  return res.json();
}

export async function getResumoAnual(ano: number): Promise<ResumoMes[]> {
  const res = await apiFetch(`${BASE}/resumo/${ano}`, { headers: authHeaders() });
  return res.json();
}

export async function getSaldoAtual(): Promise<{ saldo: number; data: string }> {
  const res = await apiFetch(`${BASE}/saldo_atual`, { headers: authHeaders() });
  return res.json();
}

// ── config ────────────────────────────────────────────────────────────────────

export async function getSaldoInicial(): Promise<number> {
  const res = await apiFetch(`${BASE}/config/saldo_inicial`, { headers: authHeaders() });
  const data = await res.json();
  return data.valor;
}

export async function setSaldoInicial(valor: number): Promise<number> {
  const res = await apiFetch(`${BASE}/config/saldo_inicial`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ valor }),
  });
  const data = await res.json();
  return data.valor;
}
