import type { Metadata } from "next";
import { Flame, MessageCircle, Pickaxe, SearchCheck } from "lucide-react";
import { destinoSeguro } from "@/lib/acesso";
import { AuroraFundo } from "@/components/fx/AuroraFundo";
import { PastilhaCromada } from "@/components/fx/PastilhaCromada";
import { TextoDecrypt } from "@/components/fx/TextoDecrypt";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar · Garimpo" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { de, erro } = await searchParams;
  const semAcesso = erro === "acesso";

  return (
    <main className="hero-glow grid flex-1 place-items-center px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-line bg-panel p-2 md:grid-cols-[1.1fr_1fr]">
        {/* lado da marca: no celular vira um cabeçalho compacto (logo + 1 linha); no desktop, o painel inteiro */}
        <section className="relative isolate flex flex-col justify-between overflow-hidden rounded-3xl bg-panel-2 p-6 md:p-8">
          <AuroraFundo />
          <span className="relative flex items-center gap-2">
            <PastilhaCromada icon={Pickaxe} tamanho="sm" />
            <span className="font-display text-xl font-bold italic">Garimpo</span>
          </span>

          <h1 className="relative mt-4 font-display text-2xl font-bold leading-tight md:mt-0 md:text-4xl">
            <TextoDecrypt texto="Seu próximo cliente" />{" "}
            <TextoDecrypt texto="ainda não tem site." className="texto-cromado" atrasoMs={300} />
          </h1>

          <ul className="relative mt-8 hidden space-y-3 text-sm text-cream/80 md:block">
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

          <p className="relative mt-8 hidden font-mono text-[11px] uppercase tracking-widest text-muted md:block">
            Acesso restrito · uso próprio
          </p>
        </section>

        <LoginForm key={semAcesso ? "acesso" : "ok"} destino={destinoSeguro(de)} semAcesso={semAcesso} />
      </div>
    </main>
  );
}
