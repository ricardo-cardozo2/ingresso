'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as QR from 'qrcode.react';

type Band = {
  id: string;
  name: string;
};

// ----- Helpers de CPF -----
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
  if (/^(\d)\1+$/.test(cpf)) return false; // 00000000000, 11111111111, etc.

  // 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i], 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cpf[9], 10)) return false;

  // 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i], 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cpf[10], 10)) return false;

  return true;
}

export default function HomePage() {
  const [bands, setBands] = useState<Band[]>([]);
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState(''); // armazenamos MASCARADO aqui
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

      if (!error && data) {
        setBands(data as Band[]);
      } else {
        console.error(error);
      }
    };

    loadBands();
  }, []);

  const handleCpfChange = (value: string) => {
    setCpf(formatCpf(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const cpfDigits = onlyDigits(cpf);

    if (!fullName || !cpfDigits || !bandId) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!isValidCpf(cpfDigits)) {
      setError('CPF inválido. Verifique os dados digitados.');
      return;
    }

    setIsSubmitting(true);

    const { error: insertError } = await supabase.from('tickets').insert({
      full_name: fullName.trim(),
      cpf: cpfDigits,      // ✅ só dígitos no banco
      band_id: bandId,
    });

    setIsSubmitting(false);

    if (insertError) {
      console.error(insertError);
      setError('Erro ao registrar seu ingresso. Tente novamente.');
      return;
    }

    setSuccess(true);
    // Se quiser limpar o formulário depois:
    // setFullName('');
    // setCpf('');
    // setBandId('');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4">
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-8 space-y-6 text-white">

        <h1 className="text-3xl font-bold text-center mb-2">
          Compra de Ingresso
        </h1>

        <p className="text-center text-sm text-gray-400">
          Valor do ingresso:{' '}
          <span className="text-green-400 font-semibold">R$ {ticketPrice}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">

          {/* Nome */}
          <div>
            <label className="block text-sm mb-1 text-gray-300">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              required
            />
          </div>

          {/* CPF com máscara */}
          <div>
            <label className="block text-sm mb-1 text-gray-300">
              CPF <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition"
              value={cpf}
              onChange={(e) => handleCpfChange(e.target.value)}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14} // 000.000.000-00
              required
            />
          </div>

          {/* Banda */}
          <div>
            <label className="block text-sm mb-1 text-gray-300">
              Banda <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition"
              value={bandId}
              onChange={(e) => setBandId(e.target.value)}
              required
            >
              <option value="" className="text-gray-400">
                Selecione uma banda
              </option>
              {bands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-400 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 rounded-lg transition transform hover:scale-[1.02] disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar dados e gerar PIX'}
          </button>
        </form>

        {/* PIX */}
        {success && (
          <div className="border-t border-[#30363d] pt-6 space-y-3">
            <h2 className="text-xl font-semibold text-center text-green-400">
              Escaneie o QRCode para pagar o PIX
            </h2>

            <p className="text-xs text-gray-400 text-center">
              Após o pagamento, guarde o comprovante.
            </p>

            <div className="flex justify-center py-4">
              <QR.QRCodeSVG value={pixPayload} size={220} />
            </div>

            <div className="bg-[#0d1117] p-4 rounded border border-[#30363d] text-xs break-all">
              <strong className="text-gray-300">Pix copia e cola:</strong>
              <br />
              <span className="text-gray-400">{pixPayload}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
