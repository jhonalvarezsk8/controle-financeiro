const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Lancamento {
  id: number;
  data: string;
  mes: number;
  ano: number;
  entrada: number | null;
  saida: number | null;
  diario: number | null;
  saldo: number | null;
}

export interface LancamentoCreate {
  data: string;
  entrada?: number | null;
  saida?: number | null;
  diario?: number | null;
  saldo?: number | null;
}

export interface LancamentoUpdate {
  entrada?: number | null;
  saida?: number | null;
  diario?: number | null;
  saldo?: number | null;
}

export interface ResumoMes {
  mes: number;
  ano: number;
  total_entradas: number;
  total_saidas: number;
  total_diario: number;
  saida_total: number;
  performance: number;
  saldo_final: number | null;
}

export async function getLancamentosMes(ano: number, mes: number): Promise<Lancamento[]> {
  const res = await fetch(`${BASE}/lancamentos/mes/${ano}/${mes}`);
  return res.json();
}

export async function criarLancamento(dados: LancamentoCreate): Promise<Lancamento> {
  const res = await fetch(`${BASE}/lancamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return res.json();
}

export async function editarLancamento(id: number, dados: LancamentoUpdate): Promise<Lancamento> {
  const res = await fetch(`${BASE}/lancamentos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return res.json();
}

export async function excluirLancamento(id: number): Promise<void> {
  await fetch(`${BASE}/lancamentos/${id}`, { method: "DELETE" });
}

export async function getResumoAnual(ano: number): Promise<ResumoMes[]> {
  const res = await fetch(`${BASE}/resumo/${ano}`);
  return res.json();
}
