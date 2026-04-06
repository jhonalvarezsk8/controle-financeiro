import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getResumoAnual, type ResumoMes } from "../api";
import GraficoAnual from "../components/GraficoAnual";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const ANO = new Date().getFullYear();

export default function Dashboard() {
  const [resumo, setResumo] = useState<ResumoMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResumoAnual(ANO).then((data) => {
      setResumo(data);
      setLoading(false);
    });
  }, []);

  const totalEntradas = resumo.reduce((s, r) => s + r.total_entradas, 0);
  const totalSaidas = resumo.reduce((s, r) => s + r.saida_total, 0);
  const performance = totalEntradas - totalSaidas;
  const saldoAtual = resumo.filter((r) => r.saldo_final !== null).at(-1)?.saldo_final ?? null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Controle Financeiro — {ANO}
      </h1>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <Card label="Saldo Atual" value={saldoAtual} color="blue" />
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
                <th className="py-2 px-4 font-medium text-right">Entradas</th>
                <th className="py-2 px-4 font-medium text-right">Saídas</th>
                <th className="py-2 px-4 font-medium text-right">Performance</th>
                <th className="py-2 px-4 font-medium text-right">Saldo Final</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {resumo.map((r) => (
                <tr key={r.mes} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-4 font-medium text-gray-700">{MESES[r.mes - 1]}</td>
                  <td className="py-2 px-4 text-right text-green-700">{BRL.format(r.total_entradas)}</td>
                  <td className="py-2 px-4 text-right text-red-600">{BRL.format(r.saida_total)}</td>
                  <td className={`py-2 px-4 text-right font-semibold ${r.performance >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {BRL.format(r.performance)}
                  </td>
                  <td className="py-2 px-4 text-right text-blue-700">
                    {r.saldo_final !== null ? BRL.format(r.saldo_final) : "—"}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <Link
                      to={`/mes/${r.mes}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number | null; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-600",
  };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color] ?? "text-gray-800"}`}>
        {value !== null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) : "—"}
      </p>
    </div>
  );
}
