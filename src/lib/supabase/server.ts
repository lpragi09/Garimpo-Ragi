import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, supabaseLigado } from "./config";
import { emailPermitido } from "../acesso";

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

// Quem está logado e liberado — ou `null`. Sem Supabase, só em dev, devolve um usuário local.
export async function usuarioAtual() {
  // sempre por requisição: a página nunca pode ser gerada estática no build
  await connection();
  const supabase = await getSupabaseServer();
  if (!supabase) return process.env.NODE_ENV === "production" ? null : { id: "local", email: "local" };
  const { data } = await supabase.auth.getUser();
  return emailPermitido(data.user?.email) ? data.user : null;
}

// Segunda trava, dentro de cada página privada: se o proxy falhar ou for
// pulado por algum motivo, a página em si também não renderiza sem login.
export async function exigirLogin() {
  const user = await usuarioAtual();
  if (!user) redirect("/login");
  return user;
}
