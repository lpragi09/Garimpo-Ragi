"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, LogOut, Pickaxe } from "lucide-react";
import { supabaseLigado } from "@/lib/supabase/config";
import { PastilhaCromada } from "./fx/PastilhaCromada";

const LINKS = [
  { href: "/", label: "Garimpar", icon: Pickaxe },
  { href: "/leads", label: "Meus leads", icon: Bookmark },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/login")) return null;

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // supabase-js só entra no bundle se alguém realmente clicar em "Sair".
  async function sair() {
    const { getSupabase } = await import("@/lib/supabase/client");
    await getSupabase()?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3">
        {/* Celular: topo só com a logo — sem blur, que é caro na tela pequena */}
        <div className="flex h-14 items-center rounded-2xl border border-line bg-panel/95 px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <PastilhaCromada icon={Pickaxe} tamanho="sm" />
            <span className="font-display text-lg font-bold italic tracking-tight">Garimpo</span>
          </Link>
        </div>

        {/* Desktop/tablet: pílula flutuante de vidro com os links */}
        <nav className="relative mx-auto hidden h-16 max-w-3xl items-center justify-between rounded-2xl px-4 vidro md:flex">
          <Link href="/" className="flex items-center gap-2">
            <PastilhaCromada icon={Pickaxe} tamanho="sm" />
            <span className="font-display text-lg font-bold italic tracking-tight">Garimpo</span>
          </Link>

          <div className="flex items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={ativo(l.href) ? "page" : undefined}
                className={`relative rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  ativo(l.href) ? "text-cream" : "text-muted hover:text-cream"
                }`}
              >
                {l.label}
                {ativo(l.href) && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-lime shadow-[0_0_8px_1px_rgb(10_228_72/0.8)]"
                  />
                )}
              </Link>
            ))}
            {supabaseLigado && (
              <button
                type="button"
                onClick={sair}
                aria-label="Sair"
                className="ml-1 grid size-9 place-items-center rounded-xl bg-panel-2 text-muted transition-colors hover:text-cream"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Celular: dock flutuante fixo embaixo, no lugar do menu de meia tela.
          Sem o "vidro" (translúcido demais): aqui o conteúdo da página passa por baixo,
          então o fundo precisa ser opaco — sem blur, que é caro na tela pequena e nem entra. */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-4 bottom-4 z-50 flex items-stretch justify-around rounded-2xl border border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] md:hidden"
      >
        {LINKS.map((l) => {
          const Icon = l.icon;
          const atv = ativo(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={atv ? "page" : undefined}
              aria-label={l.label}
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1"
            >
              <Icon className={`size-5 ${atv ? "text-lime" : "text-muted"}`} strokeWidth={2} />
              <span
                aria-hidden
                className={`size-1 rounded-full ${atv ? "bg-lime shadow-[0_0_6px_1px_rgb(10_228_72/0.8)]" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
        {supabaseLigado && (
          <button
            type="button"
            onClick={sair}
            aria-label="Sair"
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-muted"
          >
            <LogOut className="size-5" strokeWidth={2} />
            <span aria-hidden className="size-1 rounded-full bg-transparent" />
          </button>
        )}
      </nav>
    </>
  );
}
