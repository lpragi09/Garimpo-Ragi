"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, Pickaxe } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

// Sem cadastro aqui: o único usuário é criado no painel do Supabase
// (Authentication > Users > Add user) e o "Allow new users to sign up" fica desligado.
export function LoginForm({ destino, semAcesso }: { destino: string; semAcesso: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(
    semAcesso ? "Essa conta não tem acesso ao Garimpo." : null,
  );
  const [carregando, setCarregando] = useState(false);

  // Conta logada mas fora da lista de permitidos: derruba a sessão.
  useEffect(() => {
    if (semAcesso) getSupabase()?.auth.signOut();
  }, [semAcesso]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      router.replace(destino);
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      // mensagem genérica de propósito: não entrega se o e-mail existe
      setErro(
        error.status === 429
          ? "Muitas tentativas. Espere alguns minutos."
          : "E-mail ou senha incorretos.",
      );
      setSenha("");
      setCarregando(false);
      return;
    }
    // O proxy decide se o e-mail é permitido; se não for, volta pra cá com ?erro=acesso.
    router.replace(destino);
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="flex flex-col justify-center p-6 sm:p-10">
      <span className="grid size-10 place-items-center rounded-xl bg-lime text-ink md:hidden">
        <Pickaxe className="size-5" strokeWidth={2.5} />
      </span>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-muted md:mt-0">Painel</p>
      <h2 className="mt-1 font-display text-3xl font-bold">Entrar</h2>
      <p className="mt-1 text-sm text-muted">Use a conta de administrador.</p>

      <label className="mt-8 block">
        <span className="text-xs text-muted">E-mail</span>
        <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-line bg-ink px-4 focus-within:border-lime/60">
          <Mail className="size-4 shrink-0 text-muted" />
          <input
            type="email"
            required
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
            className="h-12 w-full bg-transparent text-sm outline-none"
          />
        </span>
      </label>

      <label className="mt-4 block">
        <span className="text-xs text-muted">Senha</span>
        <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-line bg-ink pl-4 pr-1 focus-within:border-lime/60">
          <Lock className="size-4 shrink-0 text-muted" />
          <input
            type={verSenha ? "text" : "password"}
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            maxLength={200}
            className="h-12 w-full bg-transparent text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
            className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:text-cream"
          >
            {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>

      {erro && (
        <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={carregando}
        className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-lime font-bold text-ink transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        {carregando && <Loader2 className="size-4 animate-spin" />}
        Entrar
      </button>
    </form>
  );
}
