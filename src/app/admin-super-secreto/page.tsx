 
'use client';

import { useEffect, useState } from 'react';
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
  total_sales: number;
};

export default function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bandSales, setBandSales] = useState<BandSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Busca todos os tickets com a banda relacionada
      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select('id, full_name, cpf, created_at, bands(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const tks = (ticketsData || []) as unknown as Ticket[];
      setTickets(tks);

      // Calcula as vendas por banda em memória
      const map = new Map<string, BandSale>();

      tks.forEach((t) => {
        const bandName = t.bands?.name;
        if (!bandName) return;

        const current = map.get(bandName) || { name: bandName, total_sales: 0 };
        current.total_sales += 1;
        map.set(bandName, current);
      });

      const salesArray = Array.from(map.values()).sort(
        (a, b) => b.total_sales - a.total_sales
      );

      setBandSales(salesArray);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d1117] text-gray-300">
        <div className="animate-pulse text-lg">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1117] p-8 text-gray-300 space-y-10">
      <h1 className="text-4xl font-bold text-center text-white tracking-wide">
        Painel Admin
      </h1>

      {/* Vendas por banda */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold mb-4 text-white">
          Vendas por Banda
        </h2>

        {bandSales.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma venda registrada.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1d2430] text-gray-300">
                <th className="border border-[#30363d] px-3 py-2 text-left">
                  Banda
                </th>
                <th className="border border-[#30363d] px-3 py-2 text-right">
                  Ingressos Vendidos
                </th>
              </tr>
            </thead>
            <tbody>
              {bandSales.map((b, idx) => (
                <tr
                  key={b.name}
                  className={`${
                    idx % 2 === 0 ? 'bg-[#11161d]' : 'bg-[#0d1117]'
                  } hover:bg-[#1c2129] transition`}
                >
                  <td className="border border-[#30363d] px-3 py-2 text-gray-200">
                    {b.name}
                  </td>
                  <td className="border border-[#30363d] px-3 py-2 text-right text-green-400 font-semibold">
                    {b.total_sales}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Últimos ingressos */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold mb-4 text-white">
          Últimos Ingressos Vendidos
        </h2>

        {tickets.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum ingresso registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#30363d]">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#1d2430] text-gray-300">
                <tr>
                  <th className="border border-[#30363d] px-3 py-2 text-left">
                    Nome
                  </th>
                  <th className="border border-[#30363d] px-3 py-2 text-left">
                    CPF
                  </th>
                  <th className="border border-[#30363d] px-3 py-2 text-left">
                    Banda
                  </th>
                  <th className="border border-[#30363d] px-3 py-2 text-left">
                    Data
                  </th>
                </tr>
              </thead>

              <tbody>
                {tickets.map((t, idx) => (
                  <tr
                    key={t.id}
                    className={`${
                      idx % 2 === 0 ? 'bg-[#11161d]' : 'bg-[#0d1117]'
                    } hover:bg-[#1c2129] transition`}
                  >
                    <td className="border border-[#30363d] px-3 py-2">
                      {t.full_name}
                    </td>
                    <td className="border border-[#30363d] px-3 py-2 text-gray-300">
                      {t.cpf}
                    </td>
                    <td className="border border-[#30363d] px-3 py-2">
                      {t.bands?.name ?? '-'}
                    </td>
                    <td className="border border-[#30363d] px-3 py-2">
                      {new Date(t.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
