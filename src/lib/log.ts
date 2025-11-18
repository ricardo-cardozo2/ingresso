/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function logEvent(
  source: string,
  level: "info" | "error" | "debug",
  message: string,
  raw?: any
) {
  try {
    await supabase.from("webhook_logs").insert({
      source,
      level,
      message,
      raw,
    });
  } catch (err) {
    console.error("❌ ERRO AO SALVAR LOG NO SUPABASE", err);
  }
}
