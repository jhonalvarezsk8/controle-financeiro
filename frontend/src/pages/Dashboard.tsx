import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getResumoAnual,
  getSaldoAtual,
  getSaldoInicial,
  setSaldoInicial,
  type ResumoMes,
} from "../api";
import GraficoAnual from "../components/GraficoAnual";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const ANO = new Date().getFullYear();

function corSaldo(v: number): string {
  if (v < 0) return "text-red-600";
  if (v <= 100) return "text-yellow-500";
  return "text-green-600";
}

const OPCOES_ANO = ["entradas", "saidas", "performance"] as const;
type ColunaAno = typeof OPCOES_ANO[number];
const LABELS_ANO: Record<ColunaAno, string> = { entradas: "Entradas", saidas: "Saídas", performance: "Performance" };
const ANO_MES_ATUAL = new Date().getMonth() + 1;

export default function Dashboard() {
  const [resumo, setResumo] = useState<ResumoMes[]>([]);
  const [saldoAtual, setSaldoAtual] = useState<number | null>(null);
  const [saldoInicial, setSaldoInicialState] = useState<number>(0);
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [novoSaldo, setNovoSaldo] = useState("");
  const [loading, setLoading] = useState(true);
  const [coluna, setColuna] = useState<ColunaAno>("entradas");
  function ciclarColuna() {
    setColuna(c => {
      const i = OPCOES_ANO.indexOf(c);
      return OPCOES_ANO[(i + 1) % OPCOES_ANO.length];
    });
  }

  async function carregar() {
    const [res, sa, si] = await Promise.all([
      getResumoAnual(ANO),
      getSaldoAtual(),
      getSaldoInicial(),
    ]);
    setResumo(res);
    setSaldoAtual(sa.saldo);
    setSaldoInicialState(si);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSalvarSaldoInicial() {
    const valor = parseFloat(novoSaldo);
    if (isNaN(valor)) return;
    await setSaldoInicial(valor);
    setEditandoSaldo(false);
    carregar();
  }

  const totalEntradas = resumo.reduce((s, r) => s + r.total_entradas, 0);
  const totalSaidas = resumo.reduce((s, r) => s + r.total_saidas, 0);
  const performance = totalEntradas - totalSaidas;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to={`/mes/${ANO_MES_ATUAL}`} className="text-gray-400 hover:text-gray-600 text-sm">← Mês atual</Link>
          <h1 className="text-2xl font-bold text-gray-800">Visão Anual — {ANO}</h1>
        </div>

        {/* Saldo inicial editável */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Saldo inicial:</span>
          {editandoSaldo ? (
            <>
              <input
                type="number"
                step="0.01"
                value={novoSaldo}
                onChange={(e) => setNovoSaldo(e.target.value)}
                placeholder={saldoInicial.toString()}
                autoFocus
                className="border border-gray-300 rounded px-2 py-1 w-28 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleSalvarSaldoInicial} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Salvar</button>
              <button onClick={() => setEditandoSaldo(false)} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">Cancelar</button>
            </>
          ) : (
            <>
              <span className="font-semibold text-gray-700">{BRL.format(saldoInicial)}</span>
              <button
                onClick={() => { setNovoSaldo(saldoInicial.toString()); setEditandoSaldo(true); }}
                className="text-xs text-blue-600 hover:underline"
              >
                Editar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <Card label="Saldo Atual" value={saldoAtual} color="blue" destaque />
        <Card label="Total Entradas" value={totalEntradas} color="green" />
        <Card label="Total Saídas" value={totalSaidas} color="red" />
        <Card label="Performance Anual" value={performance} color={performance >= 0 ? "green" : "red"} />
      </div>

      {/* Gráficos */}
      {!loading && <GraficoAnual resumo={resumo} />}

      {/* Tabela resumo */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Resumo por Mês</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="py-2 px-4 font-medium">Mês</th>

                {/* Mobile: coluna alternável */}
                <th className="py-2 px-4 font-medium text-right md:hidden">
                  <button
                    onClick={ciclarColuna}
                    className="flex items-center gap-1 ml-auto text-gray-500 hover:text-gray-700"
                  >
                    {LABELS_ANO[coluna]} <span className="text-xs">▼</span>
                  </button>
                </th>

                {/* Desktop: todas as colunas */}
                <th className="hidden md:table-cell py-2 px-4 font-medium text-right">Entradas</th>
                <th className="hidden md:table-cell py-2 px-4 font-medium text-right">Saídas</th>
                <th className="hidden md:table-cell py-2 px-4 font-medium text-right">Performance</th>

                <th className="py-2 px-4 font-medium text-right">Saldo Final</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {resumo.map((r) => {
                const mesAtual = new Date().getMonth() + 1;
                const isAtual = r.mes === mesAtual;

                const valorMobile = coluna === "entradas" ? r.total_entradas : coluna === "saidas" ? r.total_saidas : r.performance;
                const corMobile = coluna === "entradas" ? "text-green-700" : coluna === "saidas" ? "text-red-600" : (r.performance >= 0 ? "text-green-700" : "text-red-600");

                return (
                  <tr key={r.mes} className={`border-b border-gray-50 hover:bg-gray-50 ${isAtual ? "bg-blue-50" : ""}`}>
                    <td className={`py-2 px-4 font-medium ${isAtual ? "text-blue-700" : "text-gray-700"}`}>
                      {MESES[r.mes - 1]}
                      {isAtual && <span className="ml-2 text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">atual</span>}
                    </td>

                    {/* Mobile: coluna ativa */}
                    <td className={`md:hidden py-2 px-4 text-right font-semibold ${corMobile}`}>
                      {BRL.format(valorMobile)}
                    </td>

                    {/* Desktop: todas */}
                    <td className="hidden md:table-cell py-2 px-4 text-right text-green-700">{BRL.format(r.total_entradas)}</td>
                    <td className="hidden md:table-cell py-2 px-4 text-right text-red-600">{BRL.format(r.total_saidas)}</td>
                    <td className={`hidden md:table-cell py-2 px-4 text-right font-semibold ${r.performance >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {BRL.format(r.performance)}
                    </td>

                    <td className={`py-2 px-4 text-right font-semibold ${corSaldo(r.saldo_final)}`}>
                      {BRL.format(r.saldo_final)}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <Link to={`/mes/${r.mes}`} className="text-xs text-blue-600 hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({
  label, value, color, destaque,
}: {
  label: string;
  value: number | null;
  color: string;
  destaque?: boolean;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-600",
  };
  return (
    <div className={`rounded-xl p-4 shadow-sm border ${destaque ? "border-blue-300 bg-blue-50" : "bg-white border-gray-200"}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color] ?? "text-gray-800"}`}>
        {value !== null ? BRL.format(value) : "—"}
      </p>
    </div>
  );
}
