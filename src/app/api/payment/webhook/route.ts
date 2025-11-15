// app/api/payment/webhook/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE! // 🔥 ESSENCIAL
);

export async function POST(req: Request) {
  const event = await req.json();

  if (event.type !== "payment") {
    return NextResponse.json({ ignored: true });
  }

  const paymentId = event.data.id;

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    }
  );

  const payment = await response.json();

  if (payment.status !== "approved") {
    return NextResponse.json({ status: payment.status });
  }

  const ticketId = payment.external_reference;

  await supabase
    .from("tickets")
    .update({
      status: "paid",
      payment_data: payment
    })
    .eq("id", ticketId);

  return NextResponse.json({ saved: true });
}
