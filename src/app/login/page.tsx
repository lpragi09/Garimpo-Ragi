"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pickaxe } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

// Sem cadastro aberto: o usuário é criado direto no painel do Supabase
// (Authentication > Users > Add user) e o "Allow new users to sign up" fica desligado.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/");
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="hero-glow grid flex-1 place-items-center px-4 py-16">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-3xl border border-line bg-panel p-2">
        <div className="rounded-2xl bg-panel-2 p-6">
          <span className="grid size-10 place-items-center rounded-xl bg-lime text-ink">
            <Pickaxe className="size-5" strokeWidth={2.5} />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold italic">Garimpo</h1>
          <p className="mt-1 text-sm text-muted">Acesso restrito.</p>

          <label className="mt-6 block text-xs text-muted">
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream outline-none focus:border-lime/60"
            />
          </label>
          <label className="mt-3 block text-xs text-muted">
            Senha
            <input
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream outline-none focus:border-lime/60"
            />
          </label>
          {erro && <p role="alert" className="mt-3 text-sm text-red-300">{erro}</p>}
        </div>
        <button
          type="submit"
          disabled={carregando}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-lime py-3.5 font-bold text-ink disabled:opacity-70"
        >
          {carregando && <Loader2 className="size-4 animate-spin" />}
          Entrar
        </button>
      </form>
    </main>
  );
}
