"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, LogOut, Menu, Pickaxe, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Garimpar" },
  { href: "/leads", label: "Meus leads" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  // Guarda em qual página o menu abriu: trocou de página, ele fecha sozinho.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/login")) return null;

  const supabase = getSupabase();
  async function sair() {
    await supabase?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      {/* pílula flutuante, no estilo da skiper-ui */}
      <nav className="relative z-20 mx-auto flex h-14 max-w-3xl items-center justify-between rounded-2xl border border-line bg-panel/80 pl-4 pr-2 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-lime text-ink">
            <Pickaxe className="size-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold italic tracking-tight">Garimpo</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={ativo(l.href) ? "page" : undefined}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                ativo(l.href) ? "bg-panel-2 text-cream" : "text-muted hover:text-cream"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {supabase && (
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

        <button
          type="button"
          onClick={() => setOpenOn(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="grid size-10 place-items-center rounded-xl bg-panel-2 md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Menu mobile: painel de meia tela que desce do topo, nunca a tela toda */}
      <div
        onClick={() => setOpenOn(null)}
        className={`fixed inset-0 z-0 bg-ink/60 backdrop-blur-sm transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        id="menu-mobile"
        className={`fixed inset-x-0 top-0 z-10 h-[50vh] rounded-b-3xl border-b border-line bg-panel pt-20 shadow-2xl shadow-black/60 transition-[translate,visibility] duration-300 ease-out md:hidden ${
          open ? "visible translate-y-0" : "pointer-events-none invisible -translate-y-full"
        }`}
      >
        <div className="flex h-full flex-col justify-between px-5 pb-6">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex items-center justify-between border-b border-line py-4 font-display text-2xl font-bold"
                >
                  {l.label}
                  <ArrowUpRight className={`size-5 ${ativo(l.href) ? "text-lime" : "text-muted"}`} />
                </Link>
              </li>
            ))}
          </ul>
          {supabase && (
            <button
              type="button"
              onClick={sair}
              className="flex items-center justify-center gap-2 rounded-full border border-line py-3 text-sm text-muted"
            >
              <LogOut className="size-4" /> Sair
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
