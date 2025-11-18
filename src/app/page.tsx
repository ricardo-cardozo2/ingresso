/* eslint-disable @next/next/no-img-element */
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Band = {
  id: string;
  name: string;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function formatCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function HomePage() {
  const router = useRouter();

  const [bands, setBands] = useState<Band[]>([]);
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [bandId, setBandId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrCopyPaste, setQrCopyPaste] = useState<string | null>(null);

  const ticketPrice = Number(process.env.NEXT_PUBLIC_TICKET_PRICE || "10.00");

  useEffect(() => {
    supabase
      .from("bands")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => data && setBands(data));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError(null);
    setQrBase64(null);
    setQrCopyPaste(null);

    const cpfDigits = onlyDigits(cpf);

    const { data: ticket, error: insertErr } = await supabase
      .from("tickets")
      .insert({
        full_name: fullName.trim(),
        cpf: cpfDigits,
        band_id: bandId,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr || !ticket) {
      setError("Erro ao registrar ingresso.");
      return;
    }

    const payment = await fetch("/api/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        full_name: fullName.trim(),
        cpf: cpfDigits,
        quantity,
        amount: ticketPrice
      })
    }).then(r => r.json());

    if (!payment.qr_base64) {
      setError("Erro ao gerar PIX.");
      return;
    }

    setQrBase64(payment.qr_base64);
    setQrCopyPaste(payment.qr_copy_paste);
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#0d1117] p-4">

      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl p-6 text-white space-y-6">

        <h1 className="text-2xl font-bold text-center">Compra de Ingresso</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm mb-1">Nome completo *</label>
            <input className="w-full h-12 bg-[#0d1117] border border-[#30363d] rounded px-3"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">CPF *</label>
            <input className="w-full h-12 bg-[#0d1117] border border-[#30363d] rounded px-3"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              maxLength={14}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Banda *</label>
            <select className="w-full h-12 bg-[#0d1117] border border-[#30363d] rounded px-3"
              value={bandId}
              onChange={(e) => setBandId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {bands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Quantidade *</label>
            <input
              type="number"
              className="w-full h-12 bg-[#0d1117] border border-[#30363d] rounded px-3"
              value={quantity}
              min={1}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <button className="w-full h-12 bg-blue-600 rounded mt-4">
            Gerar PIX
          </button>
        </form>

        {qrBase64 && (
          <div className="pt-4 border-t border-[#30363d] space-y-4">
            <img
              src={`data:image/png;base64,${qrBase64}`}
              className="w-64 h-64 mx-auto"
              alt="QRCode Pix"
            />

            <div className="bg-[#0d1117] p-4 rounded border border-[#30363d] text-xs break-all">
              <strong>Pix Copia e Cola:</strong>
              <div className="mt-1">{qrCopyPaste}</div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
