"use client";

import { Bookmark, BookmarkCheck, Flame, MapPin, MessageCircle, Phone } from "lucide-react";
import { ehCelular, formatarTelefone, linkWhatsApp, montarMensagem } from "@/lib/contato";
import type { Empresa } from "@/lib/types";
import { Nota, PresencaBadge, ehQuente } from "./ui";

type Props = {
  empresa: Empresa;
  cidade: string;
  modelo: string;
  salvo: boolean;
  onSalvar: () => void;
  indice: number;
};

// Cartão em duas camadas (moldura + painel interno), como os da skiper-ui.
export function EmpresaCard({ empresa: e, cidade, modelo, salvo, onSalvar, indice }: Props) {
  const quente = ehQuente(e);
  const celular = e.telefone ? ehCelular(e.telefone) : false;

  return (
    <article
      style={{ animationDelay: `${Math.min(indice, 12) * 40}ms` }}
      className="group flex animate-rise flex-col rounded-3xl border border-line bg-panel p-2 transition-colors hover:border-white/15"
    >
      <div className="flex flex-1 flex-col gap-4 rounded-2xl bg-panel-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <PresencaBadge presenca={e.presenca} />
          {quente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2.5 py-1 text-xs font-semibold text-amber">
              <Flame className="size-3.5" /> Quente
            </span>
          )}
        </div>

        <div>
          <h3 className="font-display text-xl font-bold leading-tight">{e.nome}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {e.categoria && <span className="text-xs uppercase tracking-wider text-muted">{e.categoria}</span>}
            <Nota nota={e.nota} avaliacoes={e.avaliacoes} />
          </div>
        </div>

        <ul className="space-y-2 text-sm text-cream/75">
          {e.endereco && (
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
              <span className="line-clamp-2">{e.endereco}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <Phone className="size-4 shrink-0 text-muted" />
            {e.telefone ? (
              <span className="font-mono text-[13px]">
                {formatarTelefone(e.telefone)}
                <span className="ml-2 text-xs text-muted">{celular ? "celular" : "fixo"}</span>
              </span>
            ) : (
              <span className="text-muted">Sem telefone no Google</span>
            )}
          </li>
          {e.site && e.presenca !== "sem_site" && (
            <li className="truncate pl-6 font-mono text-xs text-muted">
              <a href={e.site} target="_blank" rel="noreferrer" className="hover:text-cream">
                {e.site.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </li>
          )}
        </ul>
      </div>

      <div className="flex gap-2 p-2 pt-3">
        {e.telefone && celular ? (
          <a
            href={linkWhatsApp(e.telefone, montarMensagem(modelo, { nome: e.nome, cidade }))}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lime py-2.5 text-sm font-bold text-ink transition-transform active:scale-[0.98]"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        ) : e.telefone ? (
          <a
            href={`tel:${e.telefone.replace(/\D/g, "")}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cream py-2.5 text-sm font-bold text-ink"
          >
            <Phone className="size-4" /> Ligar
          </a>
        ) : (
          <span className="flex flex-1 items-center justify-center rounded-xl border border-line py-2.5 text-sm text-muted">
            Sem contato
          </span>
        )}
        {e.mapsUrl && (
          <a
            href={e.mapsUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Conferir no Google Maps"
            title="Conferir no Google Maps"
            className="grid size-10 place-items-center rounded-xl border border-line text-muted transition-colors hover:text-cream"
          >
            <MapPin className="size-4" />
          </a>
        )}
        <button
          type="button"
          onClick={onSalvar}
          disabled={salvo}
          aria-label={salvo ? "Já está nos leads" : "Salvar nos leads"}
          title={salvo ? "Já está nos leads" : "Salvar nos leads"}
          className={`grid size-10 place-items-center rounded-xl border transition-colors ${
            salvo ? "border-lime/40 bg-lime/10 text-lime" : "border-line text-muted hover:text-cream"
          }`}
        >
          {salvo ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </button>
      </div>
    </article>
  );
}
