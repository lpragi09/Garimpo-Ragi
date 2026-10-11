"use client";

import { memo, useMemo } from "react";
import { AtSign, Bookmark, BookmarkCheck, Flame, MapPin, MessageCircle, Phone } from "lucide-react";
import { ehCelular, formatarTelefone, linkWhatsApp, montarMensagem } from "@/lib/contato";
import { linkBuscaInstagram } from "@/lib/fontes/site";
import type { Empresa } from "@/lib/types";
import { SpotlightCard } from "./fx/SpotlightCard";
import { Nota, PresencaBadge, ehQuente } from "./ui";

type Props = {
  empresa: Empresa;
  cidade: string;
  nicho: string;
  modelo: string;
  salvo: boolean;
  /** Precisa ser estável (useCallback) pro `memo` poupar os outros cartões. */
  onSalvar: (e: Empresa) => void;
  indice: number;
};

// Só os 12 primeiros entram subindo, em cascata de 40 ms; o resto aparece direto
// (classes escritas por extenso pro Tailwind enxergar).
const ATRASOS = [
  "[animation-delay:0ms]",
  "[animation-delay:40ms]",
  "[animation-delay:80ms]",
  "[animation-delay:120ms]",
  "[animation-delay:160ms]",
  "[animation-delay:200ms]",
  "[animation-delay:240ms]",
  "[animation-delay:280ms]",
  "[animation-delay:320ms]",
  "[animation-delay:360ms]",
  "[animation-delay:400ms]",
  "[animation-delay:440ms]",
];

// Botão quadrado de 44 px (alvo de toque confortável).
const ICONE =
  "grid size-11 shrink-0 place-items-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime";

// Cartão em duas camadas (moldura + painel interno) com holofote seguindo o mouse.
// Fora da tela o navegador pula o layout/pintura (`content-visibility`), o que segura
// listas grandes no celular.
export const EmpresaCard = memo(function EmpresaCard({
  empresa: e,
  cidade,
  nicho,
  modelo,
  salvo,
  onSalvar,
  indice,
}: Props) {
  const quente = ehQuente(e);
  const celular = e.telefone ? ehCelular(e.telefone) : false;

  const linkZap = useMemo(
    () =>
      e.telefone && ehCelular(e.telefone)
        ? linkWhatsApp(e.telefone, montarMensagem(modelo, { nome: e.nome, cidade, nicho }))
        : null,
    [e.telefone, modelo, e.nome, cidade, nicho],
  );

  const entrada = indice < 12 ? `animate-rise ${ATRASOS[indice]}` : "";

  return (
    <SpotlightCard
      as="article"
      className={`flex min-w-0 flex-col rounded-3xl border border-line bg-panel p-2 transition-colors [contain-intrinsic-size:auto_320px] [content-visibility:auto] hover:border-white/15 ${entrada}`}
    >
      <div className="relative flex flex-1 flex-col gap-4 rounded-2xl bg-panel-2/70 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <PresencaBadge presenca={e.presenca} />
          {quente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2.5 py-1 text-xs font-semibold text-amber">
              <Flame className="size-3.5" /> Quente
            </span>
          )}
        </div>

        <div>
          <h3 className="font-display text-xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">
            {e.nome}
          </h3>
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
              <span className="text-muted">Sem telefone cadastrado</span>
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

      <div className="relative flex gap-2 p-2 pt-3">
        {linkZap ? (
          <a
            href={linkZap}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-lime text-sm font-bold text-ink shadow-[0_0_20px_-6px_rgb(10_228_72/0.6)] transition-[transform,box-shadow] hover:shadow-[0_0_28px_-4px_rgb(10_228_72/0.7)] active:scale-[0.98]"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        ) : e.telefone ? (
          <a
            href={`tel:${e.telefone.replace(/\D/g, "")}`}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cream text-sm font-bold text-ink"
          >
            <Phone className="size-4" /> Ligar
          </a>
        ) : (
          <span className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line text-sm text-muted">
            Sem contato
          </span>
        )}
        {e.presenca === "sem_site" && (
          <a
            href={linkBuscaInstagram(e.nome, cidade)}
            target="_blank"
            rel="noreferrer"
            aria-label="Procurar Instagram"
            title="Procurar Instagram"
            className={`${ICONE} border-line text-muted hover:text-cream`}
          >
            <AtSign className="size-4" />
          </a>
        )}
        {e.mapsUrl && (
          <a
            href={e.mapsUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Conferir no Google Maps"
            title="Conferir no Google Maps"
            className={`${ICONE} border-line text-muted hover:text-cream`}
          >
            <MapPin className="size-4" />
          </a>
        )}
        <button
          type="button"
          onClick={() => onSalvar(e)}
          disabled={salvo}
          aria-label={salvo ? "Já está nos leads" : "Salvar nos leads"}
          title={salvo ? "Já está nos leads" : "Salvar nos leads"}
          className={`${ICONE} ${
            salvo ? "border-lime/40 bg-lime/10 text-lime" : "border-line text-muted hover:text-cream"
          }`}
        >
          {salvo ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </button>
      </div>
    </SpotlightCard>
  );
});
