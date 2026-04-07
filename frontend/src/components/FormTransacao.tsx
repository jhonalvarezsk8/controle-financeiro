import { useState } from "react";
import type { TransacaoCreate, TransacaoUpdate, Transacao } from "../api";

interface Props {
  dataFixa?: string;
  tipoFixo?: "entrada" | "saida";
  transacao?: Transacao;
  onSalvar: (dados: TransacaoCreate | TransacaoUpdate) => void;
  onCancelar: () => void;
}

export default function FormTransacao({ dataFixa, tipoFixo, transacao, onSalvar, onCancelar }: Props) {
  const [tipo, setTipo] = useState<"entrada" | "saida">(
    transacao?.tipo ?? tipoFixo ?? "entrada"
  );
  const [valor, setValor] = useState(transacao?.valor?.toString() ?? "");
  const [descricao, setDescricao] = useState(transacao?.descricao ?? "");
  const [recorrente, setRecorrente] = useState(false);

  const edicao = !!transacao; // ao editar, não mostra opção de recorrência

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valor || parseFloat(valor) <= 0) return;
    const dados: TransacaoCreate | TransacaoUpdate = edicao
      ? { tipo, valor: parseFloat(valor), descricao: descricao || null }
      : { data: dataFixa!, tipo, valor: parseFloat(valor), descricao: descricao || null, recorrente };
    onSalvar(dados);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      {/* Tipo */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tipo</label>
        <div className="flex rounded overflow-hidden border border-gray-300">
          <button
            type="button"
            onClick={() => setTipo("entrada")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${tipo === "entrada" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            + Entrada
          </button>
          <button
            type="button"
            onClick={() => setTipo("saida")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${tipo === "saida" ? "bg-red-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            − Saída
          </button>
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Descrição</label>
        <input
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Salário, Aluguel..."
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Valor */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Valor (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Recorrente — só aparece ao criar, não ao editar */}
      {!edicao && (
        <div className="flex flex-col justify-end">
          <label className="block text-xs text-gray-500 mb-1 invisible">_</label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recorrente}
              onChange={(e) => setRecorrente(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">Repetir todo mês</span>
          </label>
          {recorrente && (
            <p className="text-xs text-blue-600 mt-1 max-w-xs">
              Será criada uma cópia independente para cada mês restante do ano, no mesmo dia.
            </p>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 items-end">
        <div className="flex flex-col justify-end">
          <label className="block text-xs text-gray-500 mb-1 invisible">_</label>
          <div className="flex gap-2">
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
        </div>
      </div>
    </form>
  );
}
