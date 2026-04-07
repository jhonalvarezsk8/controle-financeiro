import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getTransacoesDia,
  criarTransacao,
  editarTransacao,
  excluirTransacao,
  getDiasMes,
  type Transacao,
  type TransacaoCreate,
  type TransacaoUpdate,
} from "../api";
import FormTransacao from "../components/FormTransacao";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const ANO = new Date().getFullYear();

export default function Dia() {
  const { mes, dia } = useParams<{ mes: string; dia: string }>();
  const mesNum = parseInt(mes ?? "1");
  const diaNum = parseInt(dia ?? "1");

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [saldoDia, setSaldoDia] = useState<number | null>(null);
  const [adicionando, setAdicionando] = useState<"entrada" | "saida" | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const dataStr = `${ANO}-${String(mesNum).padStart(2, "0")}-${String(diaNum).padStart(2, "0")}`;
  const dataFormatada = new Date(dataStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  async function carregar() {
    const [txs, diasMes] = await Promise.all([
      getTransacoesDia(ANO, mesNum, diaNum),
      getDiasMes(ANO, mesNum),
    ]);
    setTransacoes(txs);
    const resumoDia = diasMes.find((d) => d.dia === diaNum);
    setSaldoDia(resumoDia?.saldo ?? null);
  }

  useEffect(() => {
    carregar();
  }, [mesNum, diaNum]);

  async function handleCriar(dados: TransacaoCreate | TransacaoUpdate) {
    await criarTransacao(dados as TransacaoCreate);
    setAdicionando(null);
    carregar();
  }

  async function handleEditar(id: number, dados: TransacaoUpdate) {
    await editarTransacao(id, dados);
    setEditandoId(null);
    carregar();
  }

  async function handleExcluir(id: number) {
    if (!confirm("Excluir esta transação?")) return;
    await excluirTransacao(id);
    carregar();
  }

  const totalEntradas = transacoes.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
  const totalSaidas = transacoes.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <Link to={`/mes/${mesNum}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {MESES[mesNum - 1]}
        </Link>
        <h1 className="text-xl font-bold text-gray-800 mt-1 capitalize">{dataFormatada}</h1>
      </div>

      {/* Cards do dia */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">Entradas</p>
          <p className="text-base font-bold text-green-700">{BRL.format(totalEntradas)}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">Saídas</p>
          <p className="text-base font-bold text-red-600">{BRL.format(totalSaidas)}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-200 bg-blue-50">
          <p className="text-xs text-gray-500 mb-0.5">Saldo do dia</p>
          <p className={`text-base font-bold ${saldoDia !== null && saldoDia >= 0 ? "text-blue-700" : "text-red-700"}`}>
            {saldoDia !== null ? BRL.format(saldoDia) : "—"}
          </p>
        </div>
      </div>

      {/* Formulário de nova transação */}
      {adicionando && (
        <div className="mb-4">
          <FormTransacao
            dataFixa={dataStr}
            tipoFixo={adicionando}
            onSalvar={handleCriar}
            onCancelar={() => setAdicionando(null)}
          />
        </div>
      )}

      {/* Lista de transações */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Transações</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setAdicionando("entrada"); setEditandoId(null); }}
              className="px-3 py-1.5 text-sm text-white bg-green-600 rounded hover:bg-green-700"
            >
              + Entrada
            </button>
            <button
              onClick={() => { setAdicionando("saida"); setEditandoId(null); }}
              className="px-3 py-1.5 text-sm text-white bg-red-600 rounded hover:bg-red-700"
            >
              − Saída
            </button>
          </div>
        </div>

        {transacoes.length === 0 && !adicionando ? (
          <p className="text-center text-gray-400 py-10 text-sm">
            Nenhuma transação neste dia. Clique em "+ Entrada" ou "− Saída" para começar.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="py-2 px-4 font-medium">Tipo</th>
                <th className="py-2 px-4 font-medium">Descrição</th>
                <th className="py-2 px-4 font-medium text-right">Valor</th>
                <th className="py-2 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {transacoes.map((t) => (
                <>
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        t.tipo === "entrada"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {t.tipo === "entrada" ? "↑ Entrada" : "↓ Saída"}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-gray-700">
                      {t.descricao ?? <span className="text-gray-400">—</span>}
                      {t.recorrente && (
                        <span title="Lançamento recorrente — gerou cópias nos meses seguintes" className="ml-2 text-xs text-blue-500">↻</span>
                      )}
                    </td>
                    <td className={`py-2 px-4 text-right font-semibold ${t.tipo === "entrada" ? "text-green-700" : "text-red-600"}`}>
                      {BRL.format(t.valor)}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <button
                        onClick={() => { setEditandoId(t.id); setAdicionando(null); }}
                        className="text-xs text-blue-600 hover:underline mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(t.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                  {editandoId === t.id && (
                    <tr key={`edit-${t.id}`}>
                      <td colSpan={4} className="px-4 py-2 bg-blue-50">
                        <FormTransacao
                          transacao={t}
                          onSalvar={(dados) => handleEditar(t.id, dados as TransacaoUpdate)}
                          onCancelar={() => setEditandoId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
