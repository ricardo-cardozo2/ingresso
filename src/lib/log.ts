/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://vlbjivrwlxvqywbjweeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYmppdnJ3bHh2cXl3Ymp3ZWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA0MDM3NSwiZXhwIjoyMDc4NjE2Mzc1fQ.LmORB1zPlLd2uZZNeeyIseKFopzJWlVXCihqXc9jhbE'
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
