'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import * as QR from 'qrcode.react';

type Band = {
  id: string;
  name: string;
};

// ----- Helpers -----
function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCpf(rawCpf: string): boolean {
  const cpf = onlyDigits(rawCpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +cpf[i] * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== +cpf[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += +cpf[i] * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== +cpf[10]) return false;

  return true;
}

export default function HomePage() {
  const router = useRouter();

  const [bands, setBands] = useState<Band[]>([]);
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [bandId, setBandId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ticketPrice = process.env.NEXT_PUBLIC_TICKET_PRICE || '10,00';
  const pixPayload = process.env.NEXT_PUBLIC_PIX_PAYLOAD || 'PIX_PAYLOAD_EXEMPLO';

  useEffect(() => {
    const loadBands = async () => {
      const { data, error } = await supabase
        .from('bands')
        .select('id, name')
        .order('name', { ascending: true });

      if (!error && data) setBands(data);
    };

    loadBands();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccess(false);

    const cpfDigits = onlyDigits(cpf);

    if (!fullName.trim() || !cpfDigits || !bandId) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!isValidCpf(cpfDigits)) {
      setError('CPF inválido.');
      return;
    }

    setIsSubmitting(true);

    const { data: existing } = await supabase
      .from('tickets')
      .select('id')
      .eq('cpf', cpfDigits)
      .limit(1);

    if (existing && existing.length > 0) {
      setIsSubmitting(false);
      setError('Este CPF já possui um ingresso registrado.');
      return;
    }

    const { error: insertError } = await supabase.from('tickets').insert({
      full_name: fullName.trim(),
      cpf: cpfDigits,
      band_id: bandId,
    });

    setIsSubmitting(false);

    if (insertError) {
      setError('Erro ao registrar ingresso. Tente novamente.');
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 300);
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#0d1117] to-[#111827] p-4">

      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6 sm:p-7 space-y-6 text-white">

        {/* TÍTULO */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          Compra de Ingresso
        </h1>

        <p className="text-center text-sm text-gray-400">
          Valor: <span className="text-green-400 font-semibold">R$ {ticketPrice}</span>
        </p>

        {/* FORM MOBILE */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nome */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nome completo *</label>
            <input
              className="w-full h-12 bg-[#0d1117] border border-[#30363d] rounded-xl px-3 text-sm focus:border-blue-600 outline-none"
              value={fullName}
              onChange={(e) => {
                const v = e.target.value;
                setFullName(v);

                // 🔥 SEGREDO: ACESSO ADMIN
                if (v.trim().toLowerCase() === '#admin123') {
                  router.push('/admin');
                }
              }}
              placeholder="Seu nome"
            />
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">CPF *</label>
            <input
              className="w-full h-12 bg-[#0d1117] border border-[#30363d] rounded-xl px-3 text-sm focus:border-blue-600 outline-none"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
            />
          </div>

          {/* Banda */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Banda *</label>
            <select
              className="w-full h-12 bg-[#0d1117] border border-[#30363d] rounded-xl px-3 text-sm focus:border-blue-600 outline-none"
              value={bandId}
              onChange={(e) => setBandId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {bands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* ERRO */}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 p-2 rounded-lg text-center">
              {error}
            </p>
          )}

          {/* BOTÃO */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="
              w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[.98]
              text-white text-sm font-semibold rounded-xl transition
              disabled:opacity-60
            "
          >
            {isSubmitting ? 'Salvando...' : 'Gerar PIX'}
          </button>
        </form>

        {/* QR CODE */}
        {success && (
          <div className="pt-6 space-y-4 border-t border-[#30363d]">

            <h2 className="text-xl font-semibold text-center text-green-400">
              Escaneie o QRCode
            </h2>

            <div className="flex justify-center">
              <QR.QRCodeSVG value={pixPayload} size={220} />
            </div>

            <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] text-xs break-all leading-relaxed">
              <strong className="text-gray-300">Pix Copia e Cola:</strong>
              <div className="text-gray-400 mt-1">{pixPayload}</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
