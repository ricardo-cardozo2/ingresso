// app/api/payment/create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  'https://vlbjivrwlxvqywbjweeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYmppdnJ3bHh2cXl3Ymp3ZWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA0MDM3NSwiZXhwIjoyMDc4NjE2Mzc1fQ.LmORB1zPlLd2uZZNeeyIseKFopzJWlVXCihqXc9jhbE'
);

export async function POST(req: Request) {
  try {
    const { ticketId, full_name, cpf, amount, quantity = 1 } = await req.json();
    const cpfDigits = cpf.replace(/\D/g, "");

    const finalAmount = Number(amount) * Number(quantity);

    // salvar o valor calculado internamente
    await supabase
      .from("tickets")
      .update({ ticket_amount: finalAmount })
      .eq("id", ticketId);

    const payload = {
      transaction_amount: finalAmount,
      description: "Ingresso de Show",
      payment_method_id: "pix",
      external_reference: ticketId,
      payer: {
        email: `${cpfDigits}@comprador.com`,
        first_name: full_name,
        identification: {
          type: "CPF",
          number: cpfDigits
        }
      }
    };

    const idempotencyKey = crypto.randomUUID();

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.id) {
      return NextResponse.json({ error: true, details: data }, { status: 500 });
    }

    // atualizar payment_id
    await supabase
      .from("tickets")
      .update({ payment_id: data.id })
      .eq("id", ticketId);

    return NextResponse.json({
      payment_id: data.id,
      qr_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_copy_paste: data.point_of_interaction?.transaction_data?.qr_code
    });

  } catch (error) {
    console.error("CREATE PIX ERROR:", error);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}
