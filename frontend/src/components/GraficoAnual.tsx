import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import type { ResumoMes } from "../api";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  resumo: ResumoMes[];
}

export default function GraficoAnual({ resumo }: Props) {
  const data = resumo.map((r) => ({
    mes: MESES[r.mes - 1],
    Entradas: r.total_entradas,
    Saídas: r.total_saidas,
    Saldo: r.saldo_final,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Entradas vs Saídas por Mês</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => BRL.format(Number(v))} />
            <Legend />
            <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Saldo Projetado por Mês</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => BRL.format(Number(v))} />
            <Line
              type="monotone"
              dataKey="Saldo"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
