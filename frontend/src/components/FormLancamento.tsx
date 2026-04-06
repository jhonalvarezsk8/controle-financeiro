import { useState } from "react";
import type { Lancamento, LancamentoCreate, LancamentoUpdate } from "../api";

interface Props {
  dataInicial?: string;
  lancamento?: Lancamento;
  onSalvar: (dados: LancamentoCreate | LancamentoUpdate) => void;
  onCancelar: () => void;
}

export default function FormLancamento({ dataInicial, lancamento, onSalvar, onCancelar }: Props) {
  const [data, setData] = useState(lancamento?.data ?? dataInicial ?? "");
  const [entrada, setEntrada] = useState(lancamento?.entrada?.toString() ?? "");
  const [saida, setSaida] = useState(lancamento?.saida?.toString() ?? "");
  const [diario, setDiario] = useState(lancamento?.diario?.toString() ?? "");
  const [saldo, setSaldo] = useState(lancamento?.saldo?.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dados = {
      ...(lancamento ? {} : { data }),
      entrada: entrada !== "" ? parseFloat(entrada) : null,
      saida: saida !== "" ? parseFloat(saida) : null,
      diario: diario !== "" ? parseFloat(diario) : null,
      saldo: saldo !== "" ? parseFloat(saldo) : null,
    };
    onSalvar(dados);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {!lancamento && (
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
            <input
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        {[
          { label: "Entrada (R$)", value: entrada, set: setEntrada },
          { label: "Saída (R$)", value: saida, set: setSaida },
          { label: "Diário (R$)", value: diario, set: setDiario },
          { label: "Saldo (R$)", value: saldo, set: setSaldo },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder="0,00"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button
          type="button"
          onClick={onCancelar}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}
