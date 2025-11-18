/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Ticket = {
  id: string;
  full_name: string;
  cpf: string;
  created_at: string;
  status: string;
  payment_id: string | null;
  payment_data: any | null;
  payment_amount?: number | null;
  bands: { name: string } | null;
};

type Band = {
  id: string;
  name: string;
};

const TICKET_PRICE = 10;

export default function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterName, setFilterName] = useState('');
  const [filterCPF, setFilterCPF] = useState('');
  const [filterBand, setFilterBand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Ordenação
  const [sortField, setSortField] = useState<'full_name' | 'cpf' | 'created_at' | 'band' | 'status'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // ============================
  // CARREGAR DADOS
  // ============================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [{ data: rawTickets }, { data: rawBands }] = await Promise.all([
      supabase
        .from('tickets')
        .select(`
          id,
          full_name,
          cpf,
          created_at,
          status,
          payment_id,
          payment_data,
          payment_amount,
          bands ( name )
        `)
        .order('created_at', { ascending: false }),

      supabase.from('bands').select('*').order('name'),
    ]);

    setBands(rawBands || []);

    const normalized: Ticket[] = (rawTickets || []).map((t: any) => ({
      ...t,
      bands: Array.isArray(t.bands) ? t.bands[0] : t.bands,
      payment_amount: t.payment_amount ?? (t.payment_data?.transaction_amount ?? null),
    }));

    setTickets(normalized);
    setLoading(false);
  };

  const getQuantity = (ticket: Ticket) => {
    const val = ticket.payment_amount ?? 0;
    return Math.max(1, Math.round(val / TICKET_PRICE));
  };

  const soldTickets = useMemo(() => tickets.filter((t) => t.status === 'paid'), [tickets]);
  const pendingTickets = useMemo(() => tickets.filter((t) => t.status === 'pending'), [tickets]);

  // ============================
  // NOVOS CÁLCULOS IMPORTANTES
  // ============================
  const totalIngressosVendidos = useMemo(() => {
    return soldTickets.reduce((sum, t) => sum + getQuantity(t), 0);
  }, [soldTickets]);

  const totalVendas = soldTickets.length;

  const totalArrecadado = useMemo(() => {
    return soldTickets.reduce((sum, t) => sum + getQuantity(t) * TICKET_PRICE, 0);
  }, [soldTickets]);

  // ============================
  // FILTROS
  // ============================
  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchName =
        !filterName || t.full_name.toLowerCase().includes(filterName.toLowerCase());

      const matchCPF =
        !filterCPF || t.cpf.replace(/\D/g, '').includes(filterCPF.replace(/\D/g, ''));

      const matchBand = !filterBand || t.bands?.name === filterBand;

      const matchStatus = !filterStatus || t.status === filterStatus;

      return matchName && matchCPF && matchBand && matchStatus;
    });
  }, [tickets, filterName, filterCPF, filterBand, filterStatus]);

  // ============================
  // GRÁFICO
  // ============================
  const bandSales = useMemo(() => {
    const map = new Map<string, number>();

    soldTickets.forEach((t) => {
      const name = t.bands?.name;
      if (!name) return;

      const qty = getQuantity(t);
      map.set(name, (map.get(name) ?? 0) + qty);
    });

    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [soldTickets]);

  const maxBandTotal = bandSales[0]?.total ?? 1;

  // ============================
  // ORDENAÇÃO
  // ============================
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let A: any;
      let B: any;

      switch (sortField) {
        case 'full_name':
          A = a.full_name.toLowerCase();
          B = b.full_name.toLowerCase();
          break;
        case 'cpf':
          A = a.cpf;
          B = b.cpf;
          break;
        case 'band':
          A = (a.bands?.name || '').toLowerCase();
          B = (b.bands?.name || '').toLowerCase();
          break;
        case 'status':
          A = a.status;
          B = b.status;
          break;
        default:
          A = new Date(a.created_at).getTime();
          B = new Date(b.created_at).getTime();
      }

      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const clearFilters = () => {
    setFilterName('');
    setFilterCPF('');
    setFilterBand('');
    setFilterStatus('');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d1117] text-gray-300">
        <div className="animate-pulse text-lg">Carregando...</div>
      </main>
    );
  }

  const lastSaleDate =
    soldTickets[0]?.created_at
      ? new Date(soldTickets[0].created_at).toLocaleString('pt-BR')
      : '-';

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0d1117] to-[#111827] p-4 md:p-8 text-gray-300 space-y-10">

      <h1 className="text-4xl font-bold text-center text-white">Painel Admin</h1>

      {/* CARDS (ATUALIZADOS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card title="Ingressos Vendidos" value={totalIngressosVendidos} color="green" />

        <Card title="Total de Vendas" value={totalVendas} color="blue" />

        <Card title="Total Arrecadado"
          value={'R$ ' + totalArrecadado.toFixed(2)}
          color="purple"
        />

        <Card title="Pendentes" value={pendingTickets.length} color="yellow" />

      </section>

      {/* GRÁFICO */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-2xl font-semibold text-white">📈 Vendas por Banda</h2>

        <div className="space-y-3">
          {bandSales.map((b) => (
            <div key={b.name}>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>{b.name}</span>
                <span>{b.total} ingresso(s)</span>
              </div>

              <div className="w-full bg-[#0d1117] h-4 rounded-full border border-[#30363d] overflow-hidden">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 transition-all"
                  style={{ width: `${(b.total / maxBandTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FILTROS */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl space-y-3">
        <h2 className="text-xl font-semibold text-white">Filtros</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

          <input
            className="input py-3 px-4 rounded-xl border border-[#30363d] bg-[#0d1117] text-gray-200"
            placeholder="Buscar por nome"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />

          <input
            className="input py-3 px-4 rounded-xl border border-[#30363d] bg-[#0d1117] text-gray-200"
            placeholder="Buscar por CPF"
            value={filterCPF}
            onChange={(e) => setFilterCPF(e.target.value)}
          />

          <select
            className="input py-3 px-4 rounded-xl border border-[#30363d] bg-[#0d1117] text-gray-200"
            value={filterBand}
            onChange={(e) => setFilterBand(e.target.value)}
          >
            <option value="">Todas as bandas</option>
            {bands.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            className="input py-3 px-4 rounded-xl border border-[#30363d] bg-[#0d1117] text-gray-200"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
          </select>

          <button
            className="btn-red py-3 px-4 rounded-xl border border-red-500 text-red-400 hover:bg-red-500/20 cursor-pointer"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        </div>

      </section>

      {/* TABELA */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold mb-4 text-white">🧾 Ingressos Vendidos</h2>

        <div className="overflow-x-auto rounded-xl border border-[#30363d]">
          <table className="w-full text-sm border-collapse min-w-[1000px]">
            <thead className="bg-[#1d2430] text-gray-300">
              <tr>
                <Th title="Nome" field="full_name" sortField={sortField} sortDir={sortDir} onClick={setSortField} />
                <Th title="CPF" field="cpf" sortField={sortField} sortDir={sortDir} onClick={setSortField} />
                <Th title="Banda" field="band" sortField={sortField} sortDir={sortDir} onClick={setSortField} />
                <Th title="Data" field="created_at" sortField={sortField} sortDir={sortDir} onClick={setSortField} />

                <th className="border border-[#30363d] px-4 py-3 text-left">Qtd</th>
                <th className="border border-[#30363d] px-4 py-3 text-left">Valor</th>
                <th className="border border-[#30363d] px-4 py-3 text-left">Comprovante</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((t, idx) => {
                const qty = getQuantity(t);
                const total = qty * TICKET_PRICE;

                return (
                  <tr
                    key={t.id}
                    className={`${idx % 2 === 0 ? 'bg-[#11161d]' : 'bg-[#0d1117]'} hover:bg-[#1c2129] transition`}
                  >
                    <td className="cell px-4 py-3">{t.full_name}</td>
                    <td className="cell px-4 py-3">{t.cpf}</td>
                    <td className="cell px-4 py-3">{t.bands?.name ?? '-'}</td>
                    <td className="cell px-4 py-3">{new Date(t.created_at).toLocaleString('pt-BR')}</td>
                    <td className="cell px-4 py-3">{qty}</td>
                    <td className="cell px-4 py-3">R$ {total.toFixed(2)}</td>

                    <td className="cell px-4 py-3">
                      {t.payment_data ? (
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
                          onClick={() => alert(JSON.stringify(t.payment_data, null, 2))}
                        >
                          Ver
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} setPage={setPage} />
      </section>
    </main>
  );
}

// =========================
// COMPONENTES AUXILIARES
// =========================

function Card({ title, value, color }: any) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className={`text-3xl font-bold mt-1 text-${color}-400`}>{value}</p>
    </div>
  );
}

function Th({ title, field, sortField, sortDir, onClick }: any) {
  return (
    <th
      className="border border-[#30363d] px-4 py-3 text-left cursor-pointer hover:bg-[#2b3241] transition rounded-sm"
      onClick={() => onClick(field)}
    >
      {title} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
  );
}

function Pagination({ page, totalPages, setPage }: any) {
  return (
    <div className="flex justify-center items-center gap-3 mt-4 text-sm">
      <button
        disabled={page === 1}
        onClick={() => setPage((p: number) => Math.max(1, p - 1))}
        className="px-3 py-1 bg-[#30363d] text-white rounded disabled:opacity-40 hover:bg-[#3b4657] transition"
      >
        ◀
      </button>

      <span className="text-gray-300">
        Página {page} / {totalPages}
      </span>

      <button
        disabled={page === totalPages}
        onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
        className="px-3 py-1 bg-[#30363d] text-white rounded disabled:opacity-40 hover:bg-[#3b4657] transition"
      >
        ▶
      </button>
    </div>
  );
}
