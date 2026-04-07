import { useState } from "react";
import { Link } from "react-router-dom";
import type { DiaResumo } from "../api";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v: number) => BRL.format(v);

function corSaldo(v: number): string {
  if (v < 0) return "text-red-600";
  if (v <= 100) return "text-yellow-500";
  return "text-green-600";
}

interface Props {
  diasResumo: DiaResumo[];
  mes: number;
  ano: number;
}

const OPCOES = ["entradas", "saidas"] as const;
type Coluna = typeof OPCOES[number];
const LABELS: Record<Coluna, string> = { entradas: "Entradas", saidas: "Saídas" };

export default function TabelaMes({ diasResumo, mes, ano }: Props) {
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth() + 1;
  const anoHoje = hoje.getFullYear();
  const ehMesAtual = mes === mesHoje && ano === anoHoje;

  const [coluna, setColuna] = useState<Coluna>("entradas");
  function ciclar() {
    setColuna(c => c === "entradas" ? "saidas" : "entradas");
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
            <th className="py-2 px-2 font-medium w-14">Dia</th>

            {/* Mobile: coluna alternável */}
            <th className="py-2 px-2 font-medium text-right md:hidden">
              <button
                onClick={ciclar}
                className={`flex items-center gap-1 ml-auto font-medium hover:opacity-70 ${coluna === "entradas" ? "text-green-700" : "text-red-600"}`}
              >
                {LABELS[coluna]} <span className="text-xs text-gray-400">▼</span>
              </button>
            </th>

            {/* Desktop: ambas as colunas */}
            <th className="hidden md:table-cell py-2 px-3 font-medium text-right text-green-700">Entradas</th>
            <th className="hidden md:table-cell py-2 px-3 font-medium text-right text-red-600">Saídas</th>

            <th className="py-2 px-2 font-medium text-right">Saldo</th>
            <th className="py-2 px-2 font-medium w-8"></th>
          </tr>
        </thead>
        <tbody>
          {diasResumo.map((d) => {
            const isHoje = ehMesAtual && d.dia === diaHoje;
            const isFuture = d.is_future;

            const valorMobile = coluna === "entradas" ? d.entradas : d.saidas;
            const corMobile = coluna === "entradas"
              ? (d.entradas > 0 ? "text-green-700" : isFuture ? "text-gray-300" : "text-gray-400")
              : (d.saidas > 0 ? "text-red-600" : isFuture ? "text-gray-300" : "text-gray-400");

            return (
              <tr
                key={d.dia}
                className={`border-b border-gray-100 ${
                  isHoje
                    ? "bg-blue-50 font-semibold"
                    : isFuture
                    ? "bg-white text-gray-400"
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="py-2 px-2 w-14">
                  <span className={isHoje ? "text-blue-700 font-bold" : ""}>
                    {String(d.dia).padStart(2, "0")}/{String(mes).padStart(2, "0")}
                    {isHoje && (
                      <span className="ml-1 text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5">
                        hoje
                      </span>
                    )}
                  </span>
                </td>

                {/* Mobile: coluna ativa */}
                <td className={`md:hidden py-2 px-2 text-right ${corMobile}`}>
                  {valorMobile > 0 ? fmt(valorMobile) : "—"}
                </td>

                {/* Desktop: ambas */}
                <td className={`hidden md:table-cell py-2 px-3 text-right ${d.entradas > 0 ? "text-green-700" : isFuture ? "text-gray-300" : "text-gray-400"}`}>
                  {d.entradas > 0 ? fmt(d.entradas) : "—"}
                </td>
                <td className={`hidden md:table-cell py-2 px-3 text-right ${d.saidas > 0 ? "text-red-600" : isFuture ? "text-gray-300" : "text-gray-400"}`}>
                  {d.saidas > 0 ? fmt(d.saidas) : "—"}
                </td>

                <td className={`py-2 px-2 text-right font-semibold ${corSaldo(d.saldo)}`}>
                  {fmt(d.saldo)}
                </td>
                <td className="py-2 px-2 text-right w-8">
                  <Link
                    to={`/mes/${mes}/dia/${d.dia}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
