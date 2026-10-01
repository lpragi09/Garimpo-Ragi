"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, supabaseLigado } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

// A chave aqui é a pública: quem protege os leads é o RLS (cada um só enxerga os seus).
export function getSupabase() {
  if (!supabaseLigado) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
