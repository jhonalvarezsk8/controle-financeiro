import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getLancamentosMes, criarLancamento, getResumoAnual, type Lancamento, type ResumoMes } from "../api";
import TabelaMes from "../components/TabelaMes";
import FormLancamento from "../components/FormLancamento";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ANO = new Date().getFullYear();

export default function Mes() {
  const { mes } = useParams<{ mes: string }>();
  const navigate = useNavigate();
  const mesNum = parseInt(mes ?? "1");

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  async function carregar() {
    const [lancs, resumoAnual] = await Promise.all([
      getLancamentosMes(ANO, mesNum),
      getResumoAnual(ANO),
    ]);
    setLancamentos(lancs);
    setResumo(resumoAnual.find((r) => r.mes === mesNum) ?? null);
  }

  useEffect(() => {
    carregar();
    setAdicionando(false);
  }, [mesNum]);

  async function handleNovo(dados: any) {
    await criarLancamento(dados);
    setAdicionando(false);
    carregar();
  }

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-800">{MESES[mesNum - 1]} {ANO}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => mesNum > 1 && navigate(`/mes/${mesNum - 1}`)}
            disabled={mesNum <= 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            onClick={() => mesNum < 12 && navigate(`/mes/${mesNum + 1}`)}
            disabled={mesNum >= 12}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            Próximo →
          </button>
        </div>
      </div>

      {/* Cards resumo do mês */}
      {resumo && (
        <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
          <MiniCard label="Entradas" value={resumo.total_entradas} color="green" />
          <MiniCard label="Saídas" value={resumo.saida_total} color="red" />
          <MiniCard label="Performance" value={resumo.performance} color={resumo.performance >= 0 ? "green" : "red"} />
          <MiniCard label="Saldo Final" value={resumo.saldo_final} color="blue" />
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Lançamentos</h2>
          <button
            onClick={() => setAdicionando(true)}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            + Novo lançamento
          </button>
        </div>

        {adicionando && (
          <div className="px-4 py-3 border-b border-blue-100 bg-blue-50">
            <FormLancamento
              dataInicial={hoje}
              onSalvar={handleNovo}
              onCancelar={() => setAdicionando(false)}
            />
          </div>
        )}

        <div className="px-2 py-2">
          <TabelaMes lancamentos={lancamentos} onChange={carregar} />
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: number | null; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-600",
  };
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-base font-bold ${colors[color] ?? "text-gray-800"}`}>
        {value !== null && value !== undefined
          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
          : "—"}
      </p>
    </div>
  );
}
