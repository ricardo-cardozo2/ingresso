/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Ticket = {
  id: string;
  full_name: string;
  cpf: string;
  created_at: string;
  bands: {
    name: string;
  } | null;
};

type BandSale = {
  name: string;
  total: number;
};

export default function AdminPage() {
  // Dados
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterName, setFilterName] = useState('');
  const [filterCPF, setFilterCPF] = useState('');
  const [filterBand, setFilterBand] = useState('');

  // Ordenação
  const [sortField, setSortField] = useState<'full_name' | 'cpf' | 'created_at' | 'band'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // ============================
  // 🔁 CARREGAR DADOS
  // ============================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: rawTickets, error } = await supabase
      .from('tickets')
      .select(`
        id,
        full_name,
        cpf,
        created_at,
        bands ( name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const normalized: Ticket[] = (rawTickets || []).map((t: any) => ({
      ...t,
      bands: Array.isArray(t.bands) ? t.bands[0] : t.bands,
    }));

    setTickets(normalized);
    setLoading(false);
  };

  // ============================
  // 🔎 FILTROS
  // ============================
  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchName =
        filterName.trim() === '' ||
        t.full_name.toLowerCase().includes(filterName.toLowerCase());

      const matchCPF =
        filterCPF.trim() === '' ||
        t.cpf.replace(/\D/g, '').includes(filterCPF.replace(/\D/g, ''));

      const matchBand =
        filterBand.trim() === '' ||
        (t.bands?.name || '').toLowerCase() === filterBand.toLowerCase();

      return matchName && matchCPF && matchBand;
    });
  }, [tickets, filterName, filterCPF, filterBand]);

  // ============================
  // 📊 VENDAS POR BANDA
  // ============================
  const bandSales: BandSale[] = useMemo(() => {
    const map = new Map<string, number>();

    tickets.forEach((t) => {
      const name = t.bands?.name;
      if (!name) return;
      map.set(name, (map.get(name) ?? 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [tickets]);

  const totalIngressos = tickets.length;
  const totalBandasComVendas = bandSales.length;

  // ============================
  // 🔽 ORDENAÇÃO
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
        default:
          A = new Date(a.created_at).getTime();
          B = new Date(b.created_at).getTime();
      }

      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  // ============================
  // 📄 PAGINAÇÃO
  // ============================
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  // ============================
  // ↻ LIMPAR FILTROS
  // ============================
  const clearFilters = () => {
    setFilterName('');
    setFilterCPF('');
    setFilterBand('');
    setPage(1);
  };

  // ============================
  // 📥 EXPORTAR CSV
  // ============================
  const exportCSV = () => {
    const header = ['Nome', 'CPF', 'Banda', 'Data'].join(';');
    const rows = sorted.map((t) =>
      [
        t.full_name,
        t.cpf,
        t.bands?.name ?? '-',
        new Date(t.created_at).toLocaleString('pt-BR'),
      ].join(';'),
    );

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingressos_${Date.now()}.csv`;
    a.click();
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ============================
  // RENDER
  // ============================

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d1117] text-gray-300">
        <div className="animate-pulse text-lg">Carregando...</div>
      </main>
    );
  }

  const lastTicketDate =
    tickets[0]?.created_at
      ? new Date(tickets[0].created_at).toLocaleString('pt-BR')
      : '-';

  const maxBandTotal = bandSales[0]?.total ?? 1;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0d1117] to-[#111827] p-4 md:p-8 text-gray-300 space-y-10">

      <h1 className="text-4xl font-bold text-center text-white tracking-wide drop-shadow-lg">
        Painel Admin
      </h1>

      {/* CARDS DE RESUMO */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
          <p className="text-gray-400 text-sm">Total de ingressos</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{totalIngressos}</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
          <p className="text-gray-400 text-sm">Bandas com vendas</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{totalBandasComVendas}</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
          <p className="text-gray-400 text-sm">Última venda</p>
          <p className="text-sm mt-1">{lastTicketDate}</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
          <p className="text-gray-400 text-sm">Ingressos filtrados</p>
          <p className="text-3xl font-bold text-purple-400 mt-1">{filtered.length}</p>
        </div>
      </section>

      {/* GRÁFICO DE VENDAS */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          📈 Vendas por Banda
        </h2>

        {bandSales.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma venda registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {bandSales.map((b) => (
              <div key={b.name} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{b.name}</span>
                  <span>{b.total} ingresso(s)</span>
                </div>
                <div className="w-full bg-[#0d1117] rounded-full h-3 border border-[#30363d]">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                    style={{
                      width: `${(b.total / maxBandTotal) * 100}%`,
                      minWidth: b.total > 0 ? '6%' : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FILTROS */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-6 shadow-xl space-y-3">

        <h2 className="text-xl font-semibold text-white mb-2">Filtros</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          <input
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-3 text-sm focus:border-blue-500 outline-none"
            placeholder="Buscar por nome"
            value={filterName}
            onChange={(e) => {
              setFilterName(e.target.value);
              setPage(1);
            }}
          />

          <input
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-3 text-sm focus:border-blue-500 outline-none"
            placeholder="Buscar por CPF"
            value={filterCPF}
            inputMode="numeric"
            onChange={(e) => {
              setFilterCPF(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-3 text-sm"
            value={filterBand}
            onChange={(e) => {
              setFilterBand(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas as bandas</option>
            {[...new Set(tickets.map((t) => t.bands?.name))]
              .filter(Boolean)
              .map((b) => (
                <option key={b} value={(b as string).toLowerCase()}>
                  {b}
                </option>
              ))}
          </select>

          <button
            className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-sm"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        </div>

        <button
          className="mt-3 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm"
          onClick={exportCSV}
        >
          📥 Exportar CSV
        </button>
      </section>

      {/* TABELA */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold mb-4 text-white">🧾 Ingressos Vendidos</h2>

        <div className="overflow-x-auto rounded-xl border border-[#30363d]">
          <table className="w-full text-sm border-collapse min-w-[700px]">
            <thead className="bg-[#1d2430] text-gray-300">
              <tr>
                <th
                  className="border border-[#30363d] px-3 py-2 text-left cursor-pointer"
                  onClick={() => toggleSort('full_name')}
                >
                  Nome {sortField === 'full_name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>

                <th
                  className="border border-[#30363d] px-3 py-2 text-left cursor-pointer"
                  onClick={() => toggleSort('cpf')}
                >
                  CPF {sortField === 'cpf' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>

                <th
                  className="border border-[#30363d] px-3 py-2 text-left cursor-pointer"
                  onClick={() => toggleSort('band')}
                >
                  Banda {sortField === 'band' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>

                <th
                  className="border border-[#30363d] px-3 py-2 text-left cursor-pointer"
                  onClick={() => toggleSort('created_at')}
                >
                  Data {sortField === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((t, idx) => (
                <tr
                  key={t.id}
                  className={`${
                    idx % 2 === 0 ? 'bg-[#11161d]' : 'bg-[#0d1117]'
                  } hover:bg-[#1c2129] transition`}
                >
                  <td className="border border-[#30363d] px-3 py-2">{t.full_name}</td>
                  <td className="border border-[#30363d] px-3 py-2">{t.cpf}</td>
                  <td className="border border-[#30363d] px-3 py-2">{t.bands?.name ?? '-'}</td>
                  <td className="border border-[#30363d] px-3 py-2">
                    {new Date(t.created_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="flex flex-wrap justify-center items-center gap-3 mt-4 text-sm">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 bg-[#30363d] text-white rounded disabled:opacity-40"
          >
            ◀
          </button>
          <span>
            Página {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 bg-[#30363d] text-white rounded disabled:opacity-40"
          >
            ▶
          </button>
        </div> 
      </section>
    </main> 
  );
}
