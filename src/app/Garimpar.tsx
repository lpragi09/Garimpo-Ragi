"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  Info,
  Loader2,
  MapPin,
  PencilLine,
  Phone,
  Pickaxe,
  Plus,
  Search,
} from "lucide-react";
import { NICHOS, nichoPorId } from "@/lib/nichos";
import { MENSAGEM_PADRAO, ehCelular, lerModelo, montarMensagem, salvarModelo } from "@/lib/contato";
import { idsSalvos, salvarLead } from "@/lib/leads";
import { SemAcesso, buscarOsm } from "@/lib/fontes/osm";
import type { BuscaResposta, Empresa, Fonte } from "@/lib/types";
import { EmpresaCard } from "@/components/EmpresaCard";
import { Marquee } from "@/components/Marquee";
import { Chip, ehQuente } from "@/components/ui";

type Filtro = "oportunidades" | "sem_site" | "rede_social" | "todos";
type Ordem = "contato" | "nome" | "avaliacoes" | "nota";

// celular (dá WhatsApp) > fixo > sem telefone
const pesoContato = (e: Empresa) => (!e.telefone ? 0 : ehCelular(e.telefone) ? 2 : 1);

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "oportunidades", label: "Oportunidades" },
  { id: "sem_site", label: "Sem site" },
  { id: "rede_social", label: "Só rede social" },
  { id: "todos", label: "Todos" },
];

const CIDADE_KEY = "garimpo:cidade";

// Google só se for ligado de propósito; o padrão é o OpenStreetMap, consultado daqui do navegador.
const USA_GOOGLE = process.env.NEXT_PUBLIC_FONTE_DADOS === "google";

async function buscarNoServidor(corpo: object): Promise<BuscaResposta> {
  const res = await fetch("/api/buscar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(90_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro ?? "Erro ao buscar.");
  return data;
}

export function Garimpar() {
  const [nichoId, setNichoId] = useState("barbearia");
  const [outro, setOutro] = useState("");
  const [cidade, setCidade] = useState("");
  const [busca, setBusca] = useState<{ nichoId: string; termo: string; cidade: string; nicho: string } | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [proxima, setProxima] = useState<string | null>(null);
  const [fonte, setFonte] = useState<Fonte>("osm");
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("oportunidades");
  const [ordem, setOrdem] = useState<Ordem>("contato");
  const [soTelefone, setSoTelefone] = useState(false);
  const [salvos, setSalvos] = useState<Set<string>>(new Set());
  const [modelo, setModelo] = useState(MENSAGEM_PADRAO);
  const [editandoMsg, setEditandoMsg] = useState(false);

  // localStorage só existe no navegador: lê depois da hidratação pra não divergir do HTML do servidor.
  useEffect(() => {
    let vivo = true;
    Promise.resolve().then(() => {
      if (!vivo) return;
      try {
        setCidade(localStorage.getItem(CIDADE_KEY) ?? "");
      } catch {}
      setModelo(lerModelo());
    });
    idsSalvos()
      .then((ids) => vivo && setSalvos(ids))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const termo = nichoId === "outro" ? outro.trim() : (nichoPorId(nichoId)?.termo ?? "");
  const nichoLabel = nichoId === "outro" ? outro.trim() : (nichoPorId(nichoId)?.label ?? "");

  async function chamar(pagina?: string) {
    const alvo = pagina && busca ? busca : { nichoId, termo, cidade: cidade.trim(), nicho: nichoLabel };
    if (!alvo.termo || !alvo.cidade) {
      setErro("Escolha um nicho e informe a cidade.");
      return;
    }
    setCarregando(true);
    setErro(null);
    setProgresso("");
    try {
      const r = USA_GOOGLE
        ? await buscarNoServidor({
            nicho: alvo.nichoId,
            termo: alvo.termo,
            categoria: alvo.nicho,
            cidade: alvo.cidade,
            pagina,
          })
        : await buscarOsm(alvo.nichoId, alvo.termo, alvo.cidade, alvo.nicho, setProgresso).catch((e) => {
            // navegador bloqueado pelo mapa (limite/extensão/rede): tenta a mesma busca pelo servidor
            if (!(e instanceof SemAcesso)) throw e;
            setProgresso("Tentando pelo servidor…");
            return buscarNoServidor({ nicho: alvo.nichoId, termo: alvo.termo, categoria: alvo.nicho, cidade: alvo.cidade });
          });
      setBusca(alvo);
      setFonte(r.fonte);
      setProxima(r.proximaPagina);
      setEmpresas((atual) => {
        if (!pagina) return r.empresas;
        const vistos = new Set(atual.map((e) => e.placeId));
        return [...atual, ...r.empresas.filter((e) => !vistos.has(e.placeId))];
      });
      try {
        localStorage.setItem(CIDADE_KEY, alvo.cidade);
      } catch {}
    } catch (e) {
      const tempo = e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");
      setErro(tempo ? "A busca demorou demais. Tente de novo em 1 minuto." : e instanceof Error ? e.message : "Erro ao buscar.");
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(e: Empresa) {
    if (!busca) return;
    setSalvos((s) => new Set(s).add(e.placeId));
    try {
      await salvarLead(e, { nicho: busca.nicho, cidade: busca.cidade });
    } catch (err) {
      setSalvos((s) => {
        const n = new Set(s);
        n.delete(e.placeId);
        return n;
      });
      setErro(err instanceof Error ? `Não salvou: ${err.message}` : "Não salvou o lead.");
    }
  }

  const contagem = useMemo(
    () => ({
      total: empresas.length,
      sem_site: empresas.filter((e) => e.presenca === "sem_site").length,
      rede_social: empresas.filter((e) => e.presenca === "rede_social").length,
      quentes: empresas.filter(ehQuente).length,
      telefone: empresas.filter((e) => e.telefone).length,
    }),
    [empresas],
  );

  const visiveis = useMemo(() => {
    const lista = empresas.filter(
      (e) =>
        (filtro === "todos" ? true : filtro === "oportunidades" ? e.presenca !== "tem_site" : e.presenca === filtro) &&
        (!soTelefone || e.telefone),
    );
    const ordenar: Record<Ordem, (a: Empresa, b: Empresa) => number> = {
      contato: (a, b) => pesoContato(b) - pesoContato(a) || b.avaliacoes - a.avaliacoes || a.nome.localeCompare(b.nome),
      nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
      avaliacoes: (a, b) => b.avaliacoes - a.avaliacoes,
      nota: (a, b) => (b.nota ?? 0) - (a.nota ?? 0) || b.avaliacoes - a.avaliacoes,
    };
    return lista.sort(ordenar[ordem]);
  }, [empresas, filtro, ordem, soTelefone]);

  return (
    <main className="flex-1">
      {/* ---------- Hero + busca ---------- */}
      <section className="hero-glow relative -mt-20 px-4 pb-16 pt-36 sm:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted">
            <span className="size-1.5 rounded-full bg-lime" /> OpenStreetMap · grátis · uso próprio
          </p>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
            Ache quem ainda <br className="hidden sm:block" />
            <em className="text-lime">não tem site.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
            Escolha o nicho e a cidade. O Garimpo puxa os negócios do mapa e separa quem está sem
            site ou vivendo só de Instagram.
          </p>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            chamar();
          }}
          className="mx-auto mt-10 max-w-4xl rounded-3xl border border-line bg-panel/80 p-2 backdrop-blur-xl"
        >
          <div className="rounded-2xl bg-panel-2 p-4 sm:p-5">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">Nicho</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
              {NICHOS.map((n) => {
                const Icon = n.icon;
                return (
                  <Chip key={n.id} ativo={nichoId === n.id} onClick={() => setNichoId(n.id)}>
                    <Icon className="size-4" /> {n.label}
                  </Chip>
                );
              })}
              <Chip ativo={nichoId === "outro"} onClick={() => setNichoId("outro")}>
                <Plus className="size-4" /> Outro
              </Chip>
            </div>
            {nichoId === "outro" && (
              <input
                autoFocus
                value={outro}
                onChange={(e) => setOutro(e.target.value)}
                placeholder="Ex.: loja de roupas, autoescola, floricultura…"
                maxLength={80}
                className="mt-3 w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none placeholder:text-muted/70 focus:border-lime/60"
              />
            )}
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-2xl bg-panel-2 px-4">
              <MapPin className="size-5 shrink-0 text-muted" />
              <span className="sr-only">Cidade</span>
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade — ex.: Lavras, MG"
                maxLength={80}
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted/70"
              />
            </label>
            <button
              type="submit"
              disabled={carregando}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-lime px-8 font-bold text-ink transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {carregando && !proxima ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
              Garimpar
            </button>
          </div>
        </form>

        {carregando && !proxima && (
          <p role="status" className="mx-auto mt-4 flex max-w-4xl items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin text-lime" />
            {progresso || "Buscando…"}
          </p>
        )}

        {erro && (
          <p role="alert" className="mx-auto mt-4 max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {erro}
          </p>
        )}
      </section>

      <Marquee itens={["Sem site", "Só Instagram", "Landing page", "WhatsApp direto", "Site institucional", "Qualquer cidade"]} />

      {/* ---------- Resultados ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        {!busca ? (
          <Vazio />
        ) : (
          <>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Resultado</p>
                <h2 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
                  {busca.nicho} <span className="italic text-muted">em</span> {busca.cidade}
                </h2>
              </div>
              {fonte === "osm" && (
                <p className="inline-flex max-w-sm items-start gap-1.5 text-xs text-amber sm:text-right">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Dados do OpenStreetMap: “sem site” pode ser só falta de cadastro. Confira no Google (ícone do mapa) antes de chamar.
                </p>
              )}
            </div>

            {/* números em bento */}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Numero valor={contagem.total} label="encontrados" />
              <Numero valor={contagem.sem_site} label="sem site" cor="text-lime" />
              <Numero valor={contagem.rede_social} label="só rede social" cor="text-amber" />
              {fonte === "google" ? (
                <Numero valor={contagem.quentes} label="leads quentes" cor="text-violet" />
              ) : (
                <Numero valor={contagem.telefone} label="com telefone" cor="text-violet" />
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {FILTROS.map((f) => (
                  <Chip key={f.id} ativo={filtro === f.id} onClick={() => setFiltro(f.id)}>
                    {f.label}
                  </Chip>
                ))}
                <Chip ativo={soTelefone} onClick={() => setSoTelefone((v) => !v)}>
                  <Phone className="size-4" /> Com telefone
                </Chip>
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm">
                  <ArrowDownWideNarrow className="size-4 text-muted" />
                  <span className="sr-only">Ordenar por</span>
                  <select
                    value={ordem}
                    onChange={(e) => setOrdem(e.target.value as Ordem)}
                    className="bg-transparent outline-none [&>option]:bg-panel"
                  >
                    <option value="contato">Com WhatsApp primeiro</option>
                    <option value="nome">Nome (A–Z)</option>
                    {fonte === "google" && <option value="avaliacoes">Mais avaliações</option>}
                    {fonte === "google" && <option value="nota">Melhor nota</option>}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setEditandoMsg((v) => !v)}
                  aria-expanded={editandoMsg}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-cream/80 hover:text-cream"
                >
                  <PencilLine className="size-4" /> Mensagem
                </button>
              </div>
            </div>

            {editandoMsg && (
              <EditorMensagem
                modelo={modelo}
                exemplo={visiveis[0]?.nome ?? "Barbearia do Zé"}
                cidade={busca.cidade}
                onSalvar={(t) => {
                  setModelo(t);
                  salvarModelo(t);
                  setEditandoMsg(false);
                }}
              />
            )}

            {visiveis.length === 0 ? (
              <p className="mt-10 rounded-3xl border border-dashed border-line p-10 text-center text-muted">
                {empresas.length === 0 && fonte === "osm"
                  ? "O OpenStreetMap não tem esse nicho cadastrado nessa cidade. Tente outro nicho ou uma cidade maior por perto."
                  : "Nenhum resultado com esse filtro."}
                {proxima && " Tente carregar mais resultados."}
              </p>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visiveis.map((e, i) => (
                  <EmpresaCard
                    key={e.placeId}
                    empresa={e}
                    cidade={busca.cidade}
                    modelo={modelo}
                    salvo={salvos.has(e.placeId)}
                    onSalvar={() => salvar(e)}
                    indice={i}
                  />
                ))}
              </div>
            )}

            {proxima && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => chamar(proxima)}
                  disabled={carregando}
                  className="inline-flex items-center gap-2 rounded-full border border-cream px-6 py-3 text-sm font-semibold transition-colors hover:bg-cream hover:text-ink disabled:opacity-60"
                >
                  {carregando && <Loader2 className="size-4 animate-spin" />}
                  Carregar mais 20
                </button>
                <p className="mt-2 text-xs text-muted">O Google entrega no máximo 60 por busca.</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Numero({ valor, label, cor = "text-cream" }: { valor: number; label: string; cor?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-1.5">
      <div className="rounded-xl bg-panel-2 px-4 py-3">
        <p className={`font-display text-3xl font-bold ${cor}`}>{valor}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function EditorMensagem({
  modelo,
  exemplo,
  cidade,
  onSalvar,
}: {
  modelo: string;
  exemplo: string;
  cidade: string;
  onSalvar: (t: string) => void;
}) {
  const [texto, setTexto] = useState(modelo);
  return (
    <div className="mt-4 grid gap-3 rounded-3xl border border-line bg-panel p-2 lg:grid-cols-2">
      <div className="rounded-2xl bg-panel-2 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Modelo · use {"{nome}"} e {"{cidade}"}
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          className="mt-2 w-full resize-y rounded-xl border border-line bg-ink p-3 text-sm outline-none focus:border-lime/60"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onSalvar(texto)}
            className="rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink"
          >
            Salvar modelo
          </button>
          <button
            type="button"
            onClick={() => setTexto(MENSAGEM_PADRAO)}
            className="rounded-full px-4 py-2 text-sm text-muted hover:text-cream"
          >
            Voltar ao padrão
          </button>
        </div>
      </div>
      <div className="rounded-2xl bg-[#0b141a] p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Como chega no WhatsApp</p>
        <p className="mt-3 max-w-md whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-sm leading-relaxed text-white ml-auto">
          {montarMensagem(texto, { nome: exemplo, cidade })}
        </p>
      </div>
    </div>
  );
}

function Vazio() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        { n: "01", t: "Escolha o nicho", d: "Barbearia, dentista, pet shop… ou digite qualquer outro." },
        { n: "02", t: "Veja quem está sem site", d: "Separamos sem site, só Instagram e quem já tem site. Qualquer cidade do Brasil." },
        { n: "03", t: "Chame no WhatsApp", d: "Mensagem pronta com o nome do negócio. Salve como lead." },
      ].map((p) => (
        <div key={p.n} className="rounded-3xl border border-line bg-panel p-2">
          <div className="h-full rounded-2xl bg-panel-2 p-6">
            <span className="font-mono text-xs text-lime">{p.n}</span>
            <h3 className="mt-6 font-display text-2xl font-bold">{p.t}</h3>
            <p className="mt-2 text-sm text-muted">{p.d}</p>
          </div>
        </div>
      ))}
      <p className="flex items-center justify-center gap-2 pt-4 text-sm text-muted md:col-span-3">
        <Pickaxe className="size-4" /> Nenhuma busca ainda.
      </p>
    </div>
  );
}
