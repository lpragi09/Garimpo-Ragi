"use client";

import { getSupabase } from "./supabase/client";
import type { Empresa, Lead, Status } from "./types";

// Com Supabase os leads vão pro banco (protegidos por RLS).
// Sem ele — só em desenvolvimento — ficam no localStorage, pra dá pra testar a tela.
const LOCAL_KEY = "garimpo:leads";

function lerLocal(): Lead[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function gravarLocal(leads: Lead[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(leads));
  } catch {}
}

export const usandoBanco = () => getSupabase() !== null;

export async function listarLeads(): Promise<Lead[]> {
  const sb = getSupabase();
  if (!sb) return lerLocal();
  const { data, error } = await sb.from("leads").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Lead[];
}

export async function idsSalvos(): Promise<Set<string>> {
  const sb = getSupabase();
  if (!sb) return new Set(lerLocal().map((l) => l.place_id));
  const { data } = await sb.from("leads").select("place_id");
  return new Set((data ?? []).map((l: { place_id: string }) => l.place_id));
}

export async function salvarLead(e: Empresa, contexto: { nicho: string; cidade: string }) {
  const linha = {
    place_id: e.placeId,
    nome: e.nome,
    nicho: contexto.nicho,
    cidade: contexto.cidade,
    categoria: e.categoria,
    endereco: e.endereco,
    telefone: e.telefone,
    site: e.site,
    presenca: e.presenca,
    nota: e.nota,
    avaliacoes: e.avaliacoes,
    maps_url: e.mapsUrl,
  };
  const sb = getSupabase();
  if (!sb) {
    const agora = new Date().toISOString();
    const leads = lerLocal().filter((l) => l.place_id !== e.placeId);
    gravarLocal([
      { ...linha, id: crypto.randomUUID(), status: "novo", observacao: null, created_at: agora, updated_at: agora },
      ...leads,
    ]);
    return;
  }
  const { error } = await sb.from("leads").upsert(linha, { onConflict: "user_id,place_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function atualizarLead(id: string, campos: Partial<Pick<Lead, "status" | "observacao">>) {
  const sb = getSupabase();
  if (!sb) {
    gravarLocal(lerLocal().map((l) => (l.id === id ? { ...l, ...campos, updated_at: new Date().toISOString() } : l)));
    return;
  }
  const { error } = await sb.from("leads").update(campos).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirLead(id: string) {
  const sb = getSupabase();
  if (!sb) {
    gravarLocal(lerLocal().filter((l) => l.id !== id));
    return;
  }
  const { error } = await sb.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type { Status };
