const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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
  const res = await fetch(`${BASE}/transacoes/${ano}/${mes}/${dia}`);
  return res.json();
}

export async function criarTransacao(dados: TransacaoCreate): Promise<Transacao> {
  const res = await fetch(`${BASE}/transacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return res.json();
}

export async function editarTransacao(id: number, dados: TransacaoUpdate): Promise<Transacao> {
  const res = await fetch(`${BASE}/transacoes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return res.json();
}

export async function excluirTransacao(id: number): Promise<void> {
  await fetch(`${BASE}/transacoes/${id}`, { method: "DELETE" });
}

// ── dias e resumos ────────────────────────────────────────────────────────────

export async function getDiasMes(ano: number, mes: number): Promise<DiaResumo[]> {
  const res = await fetch(`${BASE}/dias/${ano}/${mes}`);
  return res.json();
}

export async function getResumoAnual(ano: number): Promise<ResumoMes[]> {
  const res = await fetch(`${BASE}/resumo/${ano}`);
  return res.json();
}

export async function getSaldoAtual(): Promise<{ saldo: number; data: string }> {
  const res = await fetch(`${BASE}/saldo_atual`);
  return res.json();
}

// ── config ────────────────────────────────────────────────────────────────────

export async function getSaldoInicial(): Promise<number> {
  const res = await fetch(`${BASE}/config/saldo_inicial`);
  const data = await res.json();
  return data.valor;
}

export async function setSaldoInicial(valor: number): Promise<number> {
  const res = await fetch(`${BASE}/config/saldo_inicial`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valor }),
  });
  const data = await res.json();
  return data.valor;
}
