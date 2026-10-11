"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, Download, Info, Loader2, MapPin, MessageCircle, Phone, Search, Trash2 } from "lucide-react";
import { atualizarLead, excluirLead, listarLeads, usandoBanco } from "@/lib/leads";
import { ehCelular, formatarTelefone, lerModelo, linkWhatsApp, montarMensagem } from "@/lib/contato";
import { baixarCsv, leadsParaCsv } from "@/lib/exportar";
import { ordenarPorRetorno, situacaoRetorno } from "@/lib/retorno";
import { STATUS, STATUS_LABEL, type Lead, type Status } from "@/lib/types";
import { Chip, Nota, PresencaBadge } from "@/components/ui";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { Contador } from "@/components/fx/Contador";
import { TextoDecrypt } from "@/components/fx/TextoDecrypt";

const COR_STATUS: Record<Status, string> = {
  novo: "bg-sky",
  contatado: "bg-violet",
  negociando: "bg-amber",
  fechado: "bg-lime",
  perdido: "bg-white/30",
};

type CamposLead = Partial<Pick<Lead, "status" | "observacao" | "proximo_contato">>;

function nomeArquivoCsv(agora: Date) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `garimpo-leads-${ano}-${mes}-${dia}.csv`;
}

export function Leads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Status | "todos">("todos");
  const [texto, setTexto] = useState("");
  const [retornoAtivo, setRetornoAtivo] = useState(false);
  const [modelo, setModelo] = useState("");
  const banco = usandoBanco();

  useEffect(() => {
    listarLeads()
      .then(setLeads)
      .catch((e) => setErro(e.message));
  }, []);

  // lido depois de montar (não no useState) pra não dar mismatch de hidratação:
  // no servidor não existe localStorage, então o valor real só dá pra saber no navegador.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com localStorage, só existe após montar
    setModelo(lerModelo());
  }, []);

  async function mudar(id: string, campos: CamposLead) {
    const original = leads?.find((x) => x.id === id);
    setLeads((l) => l?.map((x) => (x.id === id ? { ...x, ...campos } : x)) ?? null);
    try {
      await atualizarLead(id, campos);
    } catch (e) {
      if (original) setLeads((l) => l?.map((x) => (x.id === id ? original : x)) ?? null);
      setErro(e instanceof Error ? e.message : "Não salvou.");
    }
  }

  async function remover(id: string) {
    const indice = leads?.findIndex((x) => x.id === id) ?? -1;
    const original = indice >= 0 ? leads?.[indice] : undefined;
    setLeads((l) => l?.filter((x) => x.id !== id) ?? null);
    try {
      await excluirLead(id);
    } catch (e) {
      if (original) {
        setLeads((l) => {
          if (!l) return l;
          const copia = [...l];
          copia.splice(Math.min(indice, copia.length), 0, original);
          return copia;
        });
      }
      setErro(e instanceof Error ? e.message : "Não excluiu.");
    }
  }

  const contagem = useMemo(() => {
    const c = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;
    leads?.forEach((l) => c[l.status]++);
    return c;
  }, [leads]);

  const agora = new Date();

  const retornoContagem = useMemo(
    () =>
      (leads ?? []).filter((l) => {
        const sit = situacaoRetorno(l.proximo_contato, agora);
        return sit === "atrasado" || sit === "hoje";
      }).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads],
  );

  const visiveis = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const filtrados = (leads ?? []).filter((l) => {
      if (filtro !== "todos" && l.status !== filtro) return false;
      if (q && ![l.nome, l.nicho, l.cidade].some((v) => v?.toLowerCase().includes(q))) return false;
      if (retornoAtivo) {
        const sit = situacaoRetorno(l.proximo_contato, agora);
        if (sit !== "atrasado" && sit !== "hoje") return false;
      }
      return true;
    });
    return ordenarPorRetorno(filtrados, agora);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, filtro, texto, retornoAtivo]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Pipeline</p>
      <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        <TextoDecrypt texto="Meus leads" className="texto-cromado" />
      </h1>

      {!banco && (
        <p className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          <Info className="mt-0.5 size-4 shrink-0" />
          Supabase não configurado: os leads estão só neste navegador. Preencha o .env.local para salvar no banco.
        </p>
      )}

      {/* funil em cards com holofote; no celular vira uma faixa rolável */}
      <div className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
        {STATUS.map((s) => (
          <SpotlightCard key={s} className="w-32 shrink-0 snap-start sm:w-auto">
            <button
              type="button"
              onClick={() => setFiltro(filtro === s ? "todos" : s)}
              aria-pressed={filtro === s}
              className={`w-full rounded-2xl border p-1.5 text-left transition-colors ${
                filtro === s ? "border-cream/60 bg-panel" : "border-line bg-panel hover:border-white/20"
              }`}
            >
              <div className="rounded-xl bg-panel-2 px-4 py-3">
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className={`size-2 rounded-full ${COR_STATUS[s]}`} />
                  {STATUS_LABEL[s]}
                </span>
                <Contador valor={contagem[s]} className="mt-1 block font-display text-3xl font-bold" />
              </div>
            </button>
          </SpotlightCard>
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
          <Chip ativo={retornoAtivo} onClick={() => setRetornoAtivo((v) => !v)}>
            <CalendarClock className="size-4" /> Retornar hoje · {retornoContagem}
          </Chip>
        </div>
        <div className="flex items-center gap-2 sm:w-auto">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-white/15 px-4 py-2 sm:w-72">
            <Search className="size-4 text-muted" />
            <span className="sr-only">Procurar lead</span>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Nome, nicho ou cidade"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
            />
          </label>
          <button
            type="button"
            onClick={() => baixarCsv(nomeArquivoCsv(agora), leadsParaCsv(visiveis))}
            disabled={visiveis.length === 0}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-cream/80 hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="size-4" /> Exportar CSV
          </button>
        </div>
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
          {visiveis.map((l) => (
            <LeadItem
              key={l.id}
              lead={l}
              modelo={modelo}
              agora={agora}
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
  agora,
  onMudar,
  onRemover,
}: {
  lead: Lead;
  modelo: string;
  agora: Date;
  onMudar: (c: CamposLead) => void;
  onRemover: () => void;
}) {
  const [obs, setObs] = useState(l.observacao ?? "");
  const [confirmar, setConfirmar] = useState(false);
  const salvoRef = useRef(l.observacao ?? "");
  const celular = l.telefone ? ehCelular(l.telefone) : false;
  const situacao = situacaoRetorno(l.proximo_contato, agora);

  // observação mudou de fora (ex.: desfeita após erro): acompanha
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza estado local com a prop quando ela muda de fora
    setObs(l.observacao ?? "");
    salvoRef.current = l.observacao ?? "";
  }, [l.observacao]);

  // salva 800 ms depois de parar de digitar, sem repetir o mesmo texto
  useEffect(() => {
    if (obs === salvoRef.current) return;
    const t = setTimeout(() => {
      if (obs === salvoRef.current) return;
      salvoRef.current = obs;
      onMudar({ observacao: obs || null });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs]);

  // confirmação de exclusão volta ao normal sozinha depois de 4 s
  useEffect(() => {
    if (!confirmar) return;
    const t = setTimeout(() => setConfirmar(false), 4000);
    return () => clearTimeout(t);
  }, [confirmar]);

  function salvarObs() {
    if (obs === salvoRef.current) return;
    salvoRef.current = obs;
    onMudar({ observacao: obs || null });
  }

  return (
    <SpotlightCard as="li" className="vidro animate-rise rounded-3xl p-2">
      <div className="rounded-2xl bg-panel-2/70 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PresencaBadge presenca={l.presenca} />
              {l.nicho && <span className="text-xs uppercase tracking-wider text-muted">{l.nicho}</span>}
              {situacao === "atrasado" && (
                <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400 ring-1 ring-inset ring-red-500/30">
                  Atrasado
                </span>
              )}
              {situacao === "hoje" && (
                <span className="rounded-full bg-amber/15 px-2.5 py-1 text-xs font-semibold text-amber ring-1 ring-inset ring-amber/30">
                  Retornar hoje
                </span>
              )}
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
              className="min-h-11 rounded-full border border-white/15 bg-panel px-3 py-1.5 text-sm outline-none [&>option]:bg-panel"
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-muted">
          Retornar em
          <input
            type="date"
            value={l.proximo_contato ?? ""}
            onChange={(e) => onMudar({ proximo_contato: e.target.value || null })}
            className="min-h-11 rounded-xl border border-line bg-ink px-3 py-1.5 text-sm text-cream outline-none [color-scheme:dark] focus:border-lime/60"
          />
        </label>

        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          onBlur={salvarObs}
          placeholder="Anotações: falou com quem, valor proposto, retorno…"
          rows={2}
          maxLength={4000}
          className="mt-4 w-full resize-y rounded-xl border border-line bg-ink p-3 text-sm outline-none placeholder:text-muted/60 focus:border-lime/60"
        />
      </div>

      <div className="flex gap-2 p-2 pt-3">
        {l.telefone && celular ? (
          <a
            href={linkWhatsApp(l.telefone, montarMensagem(modelo, { nome: l.nome, cidade: l.cidade, nicho: l.nicho }))}
            target="_blank"
            rel="noreferrer"
            onClick={() => l.status === "novo" && onMudar({ status: "contatado" })}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-lime py-2.5 text-sm font-bold text-ink"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        ) : l.telefone ? (
          <a
            href={`tel:${l.telefone.replace(/\D/g, "")}`}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cream py-2.5 text-sm font-bold text-ink"
          >
            <Phone className="size-4" /> {formatarTelefone(l.telefone)}
          </a>
        ) : (
          <span className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line py-2.5 text-sm text-muted">
            Sem contato
          </span>
        )}
        {l.maps_url && (
          <a
            href={l.maps_url}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir no Google Maps"
            className="grid size-11 place-items-center rounded-xl border border-line text-muted hover:text-cream"
          >
            <MapPin className="size-4" />
          </a>
        )}
        {confirmar ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRemover}
              autoFocus
              className="min-h-11 rounded-xl bg-red-500/90 px-3 text-sm font-semibold text-white"
            >
              Excluir?
            </button>
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="min-h-11 rounded-xl border border-line px-3 text-sm text-muted hover:text-cream"
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            aria-label="Excluir lead"
            className="grid size-11 place-items-center rounded-xl border border-line text-muted hover:text-red-400"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </SpotlightCard>
  );
}
