 
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
  const [bands, setBands] = useState<Band[]>([]);
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [bandId, setBandId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrCopyPaste, setQrCopyPaste] = useState<string | null>(null);

  const ticketPrice = Number(process.env.NEXT_PUBLIC_TICKET_PRICE || "13.00");

  useEffect(() => {
    supabase
      .from("bands")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => data && setBands(data));
  }, []);

  const copyToClipboard = async () => {
    if (!qrCopyPaste) return;
    await navigator.clipboard.writeText(qrCopyPaste);
    alert("PIX Copia e Cola copiado!");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setQrBase64(null);
    setQrCopyPaste(null);

    setIsSubmitting(true);

    const cpfDigits = onlyDigits(cpf);

    // 🔥 NOVO INSERT COM EMAIL
    const { data: ticket, error: insertErr } = await supabase
      .from("tickets")
      .insert({
        full_name: fullName.trim(),
        cpf: cpfDigits,
        email: email.trim(),
        band_id: bandId,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr || !ticket) {
      console.error(insertErr);
      setError("Erro ao registrar ingresso.");
      setIsSubmitting(false);
      return;
    }

    const payment = await fetch("/api/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        full_name: fullName.trim(),
        cpf: cpfDigits,
        email: email.trim(),
        quantity,
        amount: ticketPrice
      })
    }).then(r => r.json());

    if (!payment.qr_base64) {
      setError("Erro ao gerar PIX.");
      setIsSubmitting(false);
      return;
    }

    setQrBase64(payment.qr_base64);
    setQrCopyPaste(payment.qr_copy_paste);

    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#0d1117] p-4">

      
    </main>
  );
}
