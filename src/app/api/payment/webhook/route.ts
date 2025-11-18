// app/api/payment/webhook/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logEvent } from "@/lib/log";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: Request) {
  await logEvent("webhook", "info", "Webhook recebido");

  try {
    const raw = await req.text();
    await logEvent("webhook", "debug", "Raw recebido", raw);

    let event: any = null;
    try {
      event = JSON.parse(raw);
    } catch (e) {
      await logEvent("webhook", "error", "Erro ao parsear JSON", { raw, e });
      return NextResponse.json({ parse_error: true });
    }

    await logEvent("webhook", "info", "Evento parseado", event);

    if (event.type !== "payment") {
      await logEvent("webhook", "debug", "Evento ignorado", event);
      return NextResponse.json({ ignored: true });
    }

    const paymentId = event.data?.id;
    await logEvent("webhook", "info", "Payment ID extraído", { paymentId });

    // Buscar detalhes no Mercado Pago
    const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    await logEvent("mercadopago", "debug", "Consultando Mercado Pago", { url });

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });

    const payment = await response.json();
    await logEvent("mercadopago", "info", "Resposta MP recebida", payment);

    if (payment.status !== "approved") {
      await logEvent("mercadopago", "info", "Pagamento não aprovado", payment);
      return NextResponse.json({ status: payment.status });
    }

    const ticketId = payment.external_reference;
    await logEvent("webhook", "info", "Ticket ID encontrado", { ticketId });

    const updateResult = await supabase
      .from("tickets")
      .update({
        status: "paid",
        payment_id: payment.id,
        payment_data: payment,
        payment_amount: payment.transaction_amount,
        paid_at: new Date().toISOString()
      })
      .eq("id", ticketId)
      .select()
      .single();

    await logEvent(
      "update-ticket",
      updateResult.error ? "error" : "info",
      updateResult.error ? "Erro ao atualizar ticket" : "Ticket atualizado",
      updateResult
    );

    return NextResponse.json({ saved: true });

  } catch (err) {
    await logEvent("webhook", "error", "Erro geral no webhook", { err });
    return NextResponse.json({ error: true }, { status: 500 });
  }
}
