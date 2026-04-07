import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getDiasMes, getResumoAnual, getSaldoAtual, type DiaResumo, type ResumoMes } from "../api";
import TabelaMes from "../components/TabelaMes";

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

interface PeriodoMargem {
  periodoFimLabel: string;
  proximaRenda: string;
  margem: number;
}

function calcularMargensGasto(
  diasAtual: DiaResumo[],
  diasProximo: DiaResumo[],
  hoje: Date
): PeriodoMargem[] {
  const allDays = [...diasAtual, ...diasProximo];

  const incomeDays = allDays
    .filter(d => d.entradas > 0 && new Date(d.data + "T00:00:00") > hoje)
    .sort((a, b) => a.data.localeCompare(b.data));

  if (incomeDays.length === 0) return [];

  const resultado: PeriodoMargem[] = [];
  const pad = (n: number) => String(n).padStart(2, "0");

  for (let i = 0; i < Math.min(incomeDays.length, 3); i++) {
    const I = incomeDays[i];
    const INext = incomeDays[i + 1];

    const periodDays = allDays.filter(d =>
      d.data >= I.data && (!INext || d.data < INext.data)
    );
    if (periodDays.length === 0) continue;

    const margem = Math.min(...periodDays.map(d => d.saldo));

    const IDate = new Date(I.data + "T00:00:00");
    const fimDate = new Date(IDate);
    fimDate.setDate(fimDate.getDate() - 1);

    resultado.push({
      periodoFimLabel: `${pad(fimDate.getDate())}/${pad(fimDate.getMonth() + 1)}`,
      proximaRenda: `Dia ${pad(IDate.getDate())}/${pad(IDate.getMonth() + 1)}`,
      margem,
    });

    if (i === 1) break;
  }

  return resultado;
}

export default function Mes() {
  const { mes } = useParams<{ mes: string }>();
  const navigate = useNavigate();
  const mesNum = parseInt(mes ?? "1");

  const [dias, setDias] = useState<DiaResumo[]>([]);
  const [diasProximo, setDiasProximo] = useState<DiaResumo[]>([]);
  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [saldoAtual, setSaldoAtualState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    const proximoMes = mesNum === 12 ? 1 : mesNum + 1;
    const proximoAno = mesNum === 12 ? ANO + 1 : ANO;
    const mesAtualNum = new Date().getMonth() + 1;

    const fetchBase = [getDiasMes(ANO, mesNum), getResumoAnual(ANO), getSaldoAtual()] as const;
    const results = mesNum >= mesAtualNum
      ? await Promise.all([...fetchBase, getDiasMes(proximoAno, proximoMes)])
      : await Promise.all(fetchBase);

    const [diasData, resumoAnual, sa] = results;
    setDias(diasData);
    setResumo(resumoAnual.find((r) => r.mes === mesNum) ?? null);
    setSaldoAtualState(sa.saldo);
    setDiasProximo((results[3] as DiaResumo[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, [mesNum]);

  const mesAtualNum = new Date().getMonth() + 1;
  const ehMesAtualOuFuturo = mesNum >= mesAtualNum;
  const margens = ehMesAtualOuFuturo && !loading
    ? calcularMargensGasto(dias, diasProximo, new Date())
    : [];

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

      {/* Cards resumo */}
      {resumo && (
        <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
          <MiniCard label="Entradas" value={resumo.total_entradas} color="green" />
          <MiniCard label="Saídas" value={resumo.total_saidas} color="red" />
          <MiniCard label="Variável" value={resumo.performance} color={resumo.performance >= 0 ? "green" : "red"} />
          <MiniCard label="Saldo Atual" value={saldoAtual ?? 0} colorClass={corSaldo(saldoAtual ?? 0)} />
        </div>
      )}

      {/* Painel de margem de gasto */}
      {ehMesAtualOuFuturo && margens.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Margem de gasto disponível</p>
          <div className={`grid gap-4 ${margens.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {margens.map((m, i) => (
              <div key={i}>
                <p className="text-xs text-gray-400 mb-0.5">Pode gastar até {m.periodoFimLabel}</p>
                <p className={`text-lg font-bold ${corSaldo(m.margem)}`}>{BRL.format(m.margem)}</p>
                {m.margem < 0 && (
                  <p className="text-xs text-red-500 mt-0.5">Contas já superam o saldo atual</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">próx. renda: {m.proximaRenda}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-300"></span>
          Hoje
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-white border border-gray-200"></span>
          Futuro (projeção)
        </span>
        <span className="text-gray-400">Clique em "Ver detalhes" para registrar transações em um dia</span>
      </div>

      {/* Tabela de dias */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Fluxo de Caixa — {MESES[mesNum - 1]}
          </h2>
        </div>
        {loading ? (
          <p className="text-center text-gray-400 py-10">Carregando...</p>
        ) : (
          <TabelaMes diasResumo={dias} mes={mesNum} ano={ANO} />
        )}
      </div>
    </div>
  );
}

function MiniCard({ label, value, color, colorClass }: { label: string; value: number; color?: string; colorClass?: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-600",
  };
  const cls = colorClass ?? (color ? (colors[color] ?? "text-gray-800") : "text-gray-800");
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-base font-bold ${cls}`}>
        {BRL.format(value)}
      </p>
    </div>
  );
}
