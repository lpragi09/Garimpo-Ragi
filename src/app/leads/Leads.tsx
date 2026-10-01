"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Info, Loader2, MapPin, MessageCircle, Phone, Search, Trash2 } from "lucide-react";
import { atualizarLead, excluirLead, listarLeads, usandoBanco } from "@/lib/leads";
import { ehCelular, formatarTelefone, lerModelo, linkWhatsApp, montarMensagem } from "@/lib/contato";
import { STATUS, STATUS_LABEL, type Lead, type Status } from "@/lib/types";
import { Chip, Nota, PresencaBadge } from "@/components/ui";

const COR_STATUS: Record<Status, string> = {
  novo: "bg-sky",
  contatado: "bg-violet",
  negociando: "bg-amber",
  fechado: "bg-lime",
  perdido: "bg-white/30",
};

export function Leads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Status | "todos">("todos");
  const [texto, setTexto] = useState("");
  // Os botões de WhatsApp só aparecem depois que os leads carregam, então dá pra ler direto.
  const [modelo] = useState(lerModelo);
  const banco = usandoBanco();

  useEffect(() => {
    listarLeads()
      .then(setLeads)
      .catch((e) => setErro(e.message));
  }, []);

  async function mudar(id: string, campos: Partial<Pick<Lead, "status" | "observacao">>) {
    const antes = leads;
    setLeads((l) => l?.map((x) => (x.id === id ? { ...x, ...campos } : x)) ?? null);
    try {
      await atualizarLead(id, campos);
    } catch (e) {
      setLeads(antes);
      setErro(e instanceof Error ? e.message : "Não salvou.");
    }
  }

  async function remover(id: string) {
    const antes = leads;
    setLeads((l) => l?.filter((x) => x.id !== id) ?? null);
    try {
      await excluirLead(id);
    } catch (e) {
      setLeads(antes);
      setErro(e instanceof Error ? e.message : "Não excluiu.");
    }
  }

  const contagem = useMemo(() => {
    const c = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;
    leads?.forEach((l) => c[l.status]++);
    return c;
  }, [leads]);

  const visiveis = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return (leads ?? []).filter(
      (l) =>
        (filtro === "todos" || l.status === filtro) &&
        (!q || [l.nome, l.nicho, l.cidade].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [leads, filtro, texto]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Pipeline</p>
      <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Meus <em className="text-lime">leads</em>
      </h1>

      {!banco && (
        <p className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          <Info className="mt-0.5 size-4 shrink-0" />
          Supabase não configurado: os leads estão só neste navegador. Preencha o .env.local para salvar no banco.
        </p>
      )}

      {/* funil em bento */}
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STATUS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFiltro(filtro === s ? "todos" : s)}
            aria-pressed={filtro === s}
            className={`rounded-2xl border p-1.5 text-left transition-colors ${
              filtro === s ? "border-cream/60 bg-panel" : "border-line bg-panel hover:border-white/20"
            }`}
          >
            <div className="rounded-xl bg-panel-2 px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className={`size-2 rounded-full ${COR_STATUS[s]}`} />
                {STATUS_LABEL[s]}
              </span>
              <p className="mt-1 font-display text-3xl font-bold">{contagem[s]}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip ativo={filtro === "todos"} onClick={() => setFiltro("todos")}>
            Todos · {leads?.length ?? 0}
          </Chip>
          {STATUS.map((s) => (
            <Chip key={s} ativo={filtro === s} onClick={() => setFiltro(s)}>
              {STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 sm:w-72">
          <Search className="size-4 text-muted" />
          <span className="sr-only">Procurar lead</span>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nome, nicho ou cidade"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
          />
        </label>
      </div>

      {erro && (
        <p role="alert" className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erro}
        </p>
      )}

      {leads === null ? (
        <p className="mt-16 flex justify-center text-muted">
          <Loader2 className="size-6 animate-spin" />
        </p>
      ) : visiveis.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line p-12 text-center">
          <p className="text-muted">{leads.length ? "Nada com esse filtro." : "Nenhum lead salvo ainda."}</p>
          {!leads.length && (
            <Link href="/" className="mt-4 inline-block rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink">
              Ir garimpar
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 lg:grid-cols-2">
          {visiveis.map((l, i) => (
            <LeadItem
              key={l.id}
              lead={l}
              modelo={modelo}
              indice={i}
              onMudar={(c) => mudar(l.id, c)}
              onRemover={() => remover(l.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function LeadItem({
  lead: l,
  modelo,
  indice,
  onMudar,
  onRemover,
}: {
  lead: Lead;
  modelo: string;
  indice: number;
  onMudar: (c: Partial<Pick<Lead, "status" | "observacao">>) => void;
  onRemover: () => void;
}) {
  const [obs, setObs] = useState(l.observacao ?? "");
  const [confirmar, setConfirmar] = useState(false);
  const celular = l.telefone ? ehCelular(l.telefone) : false;

  return (
    <li
      style={{ animationDelay: `${Math.min(indice, 12) * 40}ms` }}
      className="animate-rise rounded-3xl border border-line bg-panel p-2"
    >
      <div className="rounded-2xl bg-panel-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PresencaBadge presenca={l.presenca} />
              {l.nicho && <span className="text-xs uppercase tracking-wider text-muted">{l.nicho}</span>}
            </div>
            <h3 className="mt-2 truncate font-display text-xl font-bold">{l.nome}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
              <Nota nota={l.nota} avaliacoes={l.avaliacoes} />
              {l.cidade && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {l.cidade}
                </span>
              )}
            </div>
          </div>
          <label className="shrink-0">
            <span className="sr-only">Status</span>
            <select
              value={l.status}
              onChange={(e) => onMudar({ status: e.target.value as Status })}
              className="rounded-full border border-white/15 bg-panel px-3 py-1.5 text-sm outline-none [&>option]:bg-panel"
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          onBlur={() => obs !== (l.observacao ?? "") && onMudar({ observacao: obs || null })}
          placeholder="Anotações: falou com quem, valor proposto, retorno…"
          rows={2}
          maxLength={4000}
          className="mt-4 w-full resize-y rounded-xl border border-line bg-ink p-3 text-sm outline-none placeholder:text-muted/60 focus:border-lime/60"
        />
      </div>

      <div className="flex gap-2 p-2 pt-3">
        {l.telefone && celular ? (
          <a
            href={linkWhatsApp(l.telefone, montarMensagem(modelo, { nome: l.nome, cidade: l.cidade }))}
            target="_blank"
            rel="noreferrer"
            onClick={() => l.status === "novo" && onMudar({ status: "contatado" })}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lime py-2.5 text-sm font-bold text-ink"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        ) : l.telefone ? (
          <a
            href={`tel:${l.telefone.replace(/\D/g, "")}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cream py-2.5 text-sm font-bold text-ink"
          >
            <Phone className="size-4" /> {formatarTelefone(l.telefone)}
          </a>
        ) : (
          <span className="flex flex-1 items-center justify-center rounded-xl border border-line py-2.5 text-sm text-muted">
            Sem contato
          </span>
        )}
        {l.maps_url && (
          <a
            href={l.maps_url}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir no Google Maps"
            className="grid size-10 place-items-center rounded-xl border border-line text-muted hover:text-cream"
          >
            <MapPin className="size-4" />
          </a>
        )}
        {confirmar ? (
          <button
            type="button"
            onClick={onRemover}
            onBlur={() => setConfirmar(false)}
            autoFocus
            className="rounded-xl bg-red-500/90 px-3 text-sm font-semibold text-white"
          >
            Excluir?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            aria-label="Excluir lead"
            className="grid size-10 place-items-center rounded-xl border border-line text-muted hover:text-red-400"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}
