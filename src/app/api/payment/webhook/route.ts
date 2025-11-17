import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: Request) {
  try {
    const event = await req.json();

    console.log("📥 WEBHOOK RECEIVED:", event);

    // Aceitar payment.created e payment.updated
    if (!event.action?.startsWith("payment")) {
      console.log("🔸 Ignorado: action não é payment.*");
      return NextResponse.json({ ignored: true });
    }

    const paymentId = event.data.id;

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }
    );

    const payment = await response.json();
    console.log("📌 PAYMENT FULL OBJECT:", payment);

    if (payment.status !== "approved") {
      console.log("🔸 Pagamento ainda não aprovado:", payment.status);
      return NextResponse.json({ status: payment.status });
    }

    const ticketId = payment.external_reference;

    if (!ticketId) {
      console.error("❌ ERRO: payment.external_reference está vazio!");
      return NextResponse.json({ error: "missing-external-reference" });
    }

    console.log("🔥 Atualizando ticket:", ticketId);

    await supabase
      .from("tickets")
      .update({
        status: "paid",
        payment_id: payment.id,
        payment_data: payment,
        paid_at: new Date().toISOString(),
        paid_amount: payment.transaction_amount
      })
      .eq("id", ticketId);

    console.log("✅ TICKET ATUALIZADO COM SUCESSO");

    return NextResponse.json({ saved: true });

  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}
