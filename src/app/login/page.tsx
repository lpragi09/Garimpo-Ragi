import type { Metadata } from "next";
import { Flame, MessageCircle, Pickaxe, SearchCheck } from "lucide-react";
import { destinoSeguro } from "@/lib/acesso";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar · Garimpo" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { de, erro } = await searchParams;

  return (
    <main className="hero-glow grid flex-1 place-items-center px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-line bg-panel p-2 md:grid-cols-[1.1fr_1fr]">
        {/* lado da marca — some no celular pra o formulário caber sem rolar */}
        <section className="relative hidden flex-col justify-between overflow-hidden rounded-3xl bg-panel-2 p-8 md:flex">
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-lime/15 blur-3xl" />
          <span className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-lime text-ink">
              <Pickaxe className="size-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-xl font-bold italic">Garimpo</span>
          </span>

          <div>
            <h1 className="font-display text-4xl font-bold leading-tight">
              Seu próximo cliente <em className="text-lime">ainda não tem site.</em>
            </h1>
            <ul className="mt-8 space-y-3 text-sm text-cream/80">
              <li className="flex items-center gap-3">
                <SearchCheck className="size-4 text-lime" /> Busca por nicho em qualquer cidade
              </li>
              <li className="flex items-center gap-3">
                <Flame className="size-4 text-amber" /> Quem está sem site separado na hora
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle className="size-4 text-sky" /> Mensagem pronta no WhatsApp
              </li>
            </ul>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Acesso restrito · uso próprio</p>
        </section>

        <LoginForm destino={destinoSeguro(de)} semAcesso={erro === "acesso"} />
      </div>
    </main>
  );
}
