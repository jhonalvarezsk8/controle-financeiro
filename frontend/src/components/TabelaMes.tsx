import { useState } from "react";
import type { Lancamento, LancamentoUpdate } from "../api";
import { editarLancamento, excluirLancamento } from "../api";
import FormLancamento from "./FormLancamento";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v: number | null) => (v !== null && v !== undefined ? BRL.format(v) : "—");

interface Props {
  lancamentos: Lancamento[];
  onChange: () => void;
}

export default function TabelaMes({ lancamentos, onChange }: Props) {
  const [editandoId, setEditandoId] = useState<number | null>(null);

  async function handleEditar(id: number, dados: LancamentoUpdate) {
    await editarLancamento(id, dados);
    setEditandoId(null);
    onChange();
  }

  async function handleExcluir(id: number) {
    if (!confirm("Excluir este lançamento?")) return;
    await excluirLancamento(id);
    onChange();
  }

  if (lancamentos.length === 0) {
    return (
      <p className="text-center text-gray-400 py-10">
        Nenhum lançamento neste mês. Clique em "+ Novo lançamento" para começar.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2 px-3 font-medium">Data</th>
            <th className="py-2 px-3 font-medium text-right">Entrada</th>
            <th className="py-2 px-3 font-medium text-right">Saída</th>
            <th className="py-2 px-3 font-medium text-right">Diário</th>
            <th className="py-2 px-3 font-medium text-right">Saldo</th>
            <th className="py-2 px-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {lancamentos.map((l) => (
            <>
              <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-700">
                  {new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR")}
                </td>
                <td className="py-2 px-3 text-right text-green-700 font-medium">{fmt(l.entrada)}</td>
                <td className="py-2 px-3 text-right text-red-600">{fmt(l.saida)}</td>
                <td className="py-2 px-3 text-right text-orange-600">{fmt(l.diario)}</td>
                <td className="py-2 px-3 text-right text-blue-700 font-semibold">{fmt(l.saldo)}</td>
                <td className="py-2 px-3 text-right">
                  <button
                    onClick={() => setEditandoId(l.id)}
                    className="text-xs text-blue-600 hover:underline mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleExcluir(l.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
              {editandoId === l.id && (
                <tr key={`edit-${l.id}`}>
                  <td colSpan={6} className="px-3 py-2 bg-blue-50">
                    <FormLancamento
                      lancamento={l}
                      onSalvar={(dados) => handleEditar(l.id, dados as LancamentoUpdate)}
                      onCancelar={() => setEditandoId(null)}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
