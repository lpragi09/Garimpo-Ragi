import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, supabaseLigado } from "./config";

export async function getSupabaseServer() {
  if (!supabaseLigado) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chamado de um Server Component: o proxy já cuida de renovar a sessão
        }
      },
    },
  });
}

// Quem está logado — ou `null`. Sem Supabase, em dev, devolve um usuário local.
export async function usuarioAtual() {
  const supabase = await getSupabaseServer();
  if (!supabase) return process.env.NODE_ENV === "production" ? null : { id: "local" };
  const { data } = await supabase.auth.getUser();
  return data.user;
}
