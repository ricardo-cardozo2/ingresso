// app/api/payment/create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: Request) {
  try {
    const { ticketId, full_name, cpf, amount } = await req.json();
    const cpfDigits = cpf.replace(/\D/g, "");

    const payload = {
      transaction_amount: Number(amount),
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

    // 🔥 Gerar chave única obrigatória
    const idempotencyKey = crypto.randomUUID();

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey // 🔥 OBRIGATÓRIO
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("MP RESPONSE RAW:", data);

    if (!data.id) {
      return NextResponse.json(
        { error: true, details: data },
        { status: 500 }
      );
    }

    // salvar payment_id
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
