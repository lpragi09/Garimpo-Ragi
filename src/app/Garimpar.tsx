"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  Info,
  LayoutGrid,
  Loader2,
  MapPin,
  MessageCircle,
  PencilLine,
  Phone,
  Pickaxe,
  Plus,
  ScanSearch,
  Search,
  Target,
  type LucideIcon,
} from "lucide-react";
import { NICHOS, TODOS, nichoPorId } from "@/lib/nichos";
import { MENSAGEM_PADRAO, lerModelo, montarMensagem, salvarModelo } from "@/lib/contato";
import { paginar, pesoContato, semSalvos } from "@/lib/filtros";
import { idsSalvos, salvarLead } from "@/lib/leads";
import type { Empresa } from "@/lib/types";
import { EmpresaCard } from "@/components/EmpresaCard";
import { Marquee } from "@/components/Marquee";
import { Chip, ehQuente } from "@/components/ui";
import { AuroraFundo } from "@/components/fx/AuroraFundo";
import { BotaoLuz } from "@/components/fx/BotaoLuz";
import { Contador } from "@/components/fx/Contador";
import { PastilhaCromada } from "@/components/fx/PastilhaCromada";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { TextoDecrypt } from "@/components/fx/TextoDecrypt";
import { useBusca } from "./useBusca";
import { mostrarVazio } from "./estadoBusca";

type Filtro = "oportunidades" | "sem_site" | "rede_social" | "todos";
type Ordem = "contato" | "nome" | "avaliacoes" | "nota";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "oportunidades", label: "Oportunidades" },
  { id: "sem_site", label: "Sem site" },
  { id: "rede_social", label: "Só rede social" },
  { id: "todos", label: "Todos" },
];

const ORDENAR: Record<Exclude<Ordem, "contato">, (a: Empresa, b: Empresa) => number> = {
  nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
  avaliacoes: (a, b) => b.avaliacoes - a.avaliacoes,
  nota: (a, b) => (b.nota ?? 0) - (a.nota ?? 0) || b.avaliacoes - a.avaliacoes,
};

const CIDADE_KEY = "garimpo:cidade";
// 4 linhas de 3 no desktop
const POR_PAGINA = 12;

export function Garimpar() {
  const [nichoId, setNichoId] = useState("barbearia");
  const [outro, setOutro] = useState("");
  const [cidade, setCidade] = useState("");
  const { busca, empresas, fonte, proxima, carregando, parcial, progresso, erro, setErro, buscar, carregarMais } =
    useBusca();
  const [filtro, setFiltro] = useState<Filtro>("oportunidades");
  const [ordem, setOrdem] = useState<Ordem>("contato");
  // "avaliações"/"nota" só existem no Google: trocou pra outra fonte, volta pro padrão
  const [fonteAnterior, setFonteAnterior] = useState(fonte);
  if (fonte !== fonteAnterior) {
    setFonteAnterior(fonte);
    if (fonte !== "google") setOrdem("contato");
  }
  const [soTelefone, setSoTelefone] = useState(false);
  // quem já virou lead sai da lista (dá pra desligar pra ver todo mundo)
  const [esconderSalvos, setEsconderSalvos] = useState(true);
  const [salvos, setSalvos] = useState<Set<string>>(new Set());
  // instantâneo de quem já estava salvo quando a busca atual começou: salvar um card durante
  // os resultados não tira ele da tela (senão o toque vira sem querer no vizinho de baixo).
  const [salvosNaBusca, setSalvosNaBusca] = useState<Set<string>>(new Set());
  // no "Todos": mostrar só um nicho dos resultados ("" = todos)
  const [nichoFiltro, setNichoFiltro] = useState("");
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
    // banco fora do ar: segue sem marcar os salvos em vez de quebrar a página
    idsSalvos()
      .then((ids) => {
        if (!vivo) return;
        setSalvos(ids);
        setSalvosNaBusca(ids);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // nova busca: trava o instantâneo de salvos pra essa rodada de resultados
  // ("carregar mais" reusa o mesmo objeto de busca, então não reseta o instantâneo).
  useEffect(() => {
    if (busca) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- trava o instantâneo quando a busca (identidade) muda
      setSalvosNaBusca(salvos);
      setNichoFiltro("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const termo =
    nichoId === TODOS ? TODOS : nichoId === "outro" ? outro.trim() : (nichoPorId(nichoId)?.termo ?? "");
  const nichoLabel =
    nichoId === TODOS ? "Todos os nichos" : nichoId === "outro" ? outro.trim() : (nichoPorId(nichoId)?.label ?? "");
  // No "Todos" cada empresa traz o próprio nicho (vai pro lead e pra mensagem do WhatsApp)
  const buscaTodos = busca?.nichoId === TODOS;
  const nichoDe = useCallback(
    (e: Empresa) => (buscaTodos && e.categoria ? e.categoria : (busca?.nicho ?? "")),
    [buscaTodos, busca],
  );

  // Estável entre renders (só muda com a busca): é o que deixa o memo dos cartões funcionar.
  const salvar = useCallback(
    async (e: Empresa) => {
      if (!busca) return;
      setSalvos((s) => new Set(s).add(e.placeId));
      try {
        await salvarLead(e, { nicho: nichoDe(e), cidade: busca.cidade });
      } catch (err) {
        setSalvos((s) => {
          const n = new Set(s);
          n.delete(e.placeId);
          return n;
        });
        setErro(err instanceof Error ? `Não salvou: ${err.message}` : "Não salvou o lead.");
      }
    },
    [busca, setErro, nichoDe],
  );

  // Os números contam tudo que a busca trouxe, não só o que está visível.
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
    const base = esconderSalvos ? semSalvos(empresas, salvosNaBusca) : empresas;
    const lista = base.filter(
      (e) =>
        (filtro === "todos" ? true : filtro === "oportunidades" ? e.presenca !== "tem_site" : e.presenca === filtro) &&
        (!soTelefone || e.telefone) &&
        (!nichoFiltro || e.categoria === nichoFiltro),
    );
    if (ordem !== "contato") return lista.sort(ORDENAR[ordem]);
    // celular (dá WhatsApp) > fixo > sem telefone; o peso é calculado uma vez por empresa
    return lista
      .map((e) => [pesoContato(e), e] as const)
      .sort(([pa, a], [pb, b]) => pb - pa || b.avaliacoes - a.avaliacoes || a.nome.localeCompare(b.nome, "pt-BR"))
      .map(([, e]) => e);
  }, [empresas, filtro, ordem, soTelefone, esconderSalvos, salvosNaBusca, nichoFiltro]);

  // nichos que apareceram no "Todos", com quantos de cada (pro seletor dos resultados)
  const nichosAchados = useMemo(() => {
    if (!buscaTodos) return [];
    const n = new Map<string, number>();
    for (const e of empresas) if (e.categoria) n.set(e.categoria, (n.get(e.categoria) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1]);
  }, [buscaTodos, empresas]);

  // Paginação: qualquer mudança de busca, filtro ou ordem volta pra página 1.
  const chaveLista = `${filtro}|${ordem}|${soTelefone}|${esconderSalvos}|${nichoFiltro}`;
  const [pag, setPag] = useState({ busca, chaveLista, pagina: 1 });
  const paginaPedida = pag.busca === busca && pag.chaveLista === chaveLista ? pag.pagina : 1;
  const pagina = paginar(visiveis, paginaPedida, POR_PAGINA);
  const topoResultados = useRef<HTMLDivElement>(null);
  const irPara = (n: number) => {
    setPag({ busca, chaveLista, pagina: n });
    topoResultados.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const garimpando = carregando === "busca";

  return (
    <main className="flex-1">
      {/* ---------- Hero + busca ---------- */}
      {/* Entrada uma vez só: aurora acende → título decifra → formulário sobe. Depois fica parado. */}
      <section className="relative isolate -mt-20 overflow-hidden px-4 pb-16 pt-36 sm:pt-44">
        <AuroraFundo className="absolute inset-0 -z-10 animate-acender" />
        <div aria-hidden className="grade-fundo absolute inset-0 -z-10" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-ink" />

        <div className="mx-auto max-w-5xl text-center">
          <p className="vidro inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-cream/80">
            <span className="size-1.5 rounded-full bg-lime shadow-[0_0_8px_1px_rgb(10_228_72/0.8)]" />
            OpenStreetMap · grátis · uso próprio
          </p>
          <h1 className="mt-7 font-display text-[clamp(2.75rem,9vw,7rem)] font-bold leading-[0.95] tracking-tighter">
            <span className="texto-cromado">Ache quem ainda</span>
            {/* o texto invisível reserva o tamanho final: os símbolos do embaralhamento não empurram a linha */}
            <span className="relative mt-1 block font-serif font-normal italic tracking-tight text-lime">
              <span className="invisible">não tem site.</span>
              <TextoDecrypt
                texto="não tem site."
                atrasoMs={150}
                className="absolute inset-0 flex justify-center whitespace-nowrap drop-shadow-[0_0_24px_rgb(10_228_72/0.35)]"
              />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg">
            Escolha o nicho e a cidade. O Garimpo puxa os negócios do mapa e separa quem está sem
            site ou vivendo só de Instagram.
          </p>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            buscar({ nichoId, termo, cidade: cidade.trim(), nicho: nichoLabel });
          }}
          className="mx-auto mt-10 max-w-4xl animate-rise rounded-3xl border border-line bg-panel p-2 shadow-[0_24px_80px_-24px_rgb(0_0_0/0.9)] [animation-delay:300ms]"
        >
          <div className="rounded-2xl bg-panel-2 py-4 sm:py-5">
            <p className="mb-3 px-4 font-mono text-[11px] uppercase tracking-widest text-muted sm:px-5">Nicho</p>
            {/* celular: faixa rolável com encaixe e bordas esmaecidas; tablet pra cima: quebra linha */}
            <div className="relative">
              <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 sm:scroll-px-5 sm:px-5 md:flex-wrap md:overflow-visible [&>*]:snap-start">
                <Chip ativo={nichoId === TODOS} onClick={() => setNichoId(TODOS)}>
                  <LayoutGrid className="size-4 opacity-80" /> Todos
                </Chip>
                {NICHOS.map((n) => (
                  <Chip key={n.id} ativo={nichoId === n.id} onClick={() => setNichoId(n.id)}>
                    <n.icon className="size-4 opacity-80" /> {n.label}
                  </Chip>
                ))}
                <Chip ativo={nichoId === "outro"} onClick={() => setNichoId("outro")}>
                  <Plus className="size-4 opacity-80" /> Outro
                </Chip>
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-panel-2 to-transparent md:hidden"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-panel-2 to-transparent md:hidden"
              />
            </div>
            {nichoId === TODOS && (
              <p className="mt-3 px-4 text-xs text-muted sm:px-5">
                Busca todos os nichos da lista na cidade. Leva até ~1 minuto (o mapa libera 1 consulta por segundo);
                os resultados vão aparecendo.
              </p>
            )}
            {nichoId === "outro" && (
              <div className="px-4 sm:px-5">
                <input
                  autoFocus
                  value={outro}
                  onChange={(e) => setOutro(e.target.value)}
                  placeholder="Ex.: loja de roupas, autoescola, floricultura…"
                  maxLength={80}
                  aria-label="Outro nicho"
                  className="mt-3 min-h-12 w-full rounded-xl border border-line bg-ink px-4 py-3 text-base outline-none placeholder:text-muted/70 focus:border-lime/60 sm:text-sm"
                />
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-panel-2 px-4 focus-within:ring-1 focus-within:ring-lime/50">
              <MapPin className="size-5 shrink-0 text-muted" />
              <span className="sr-only">Cidade</span>
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade — ex.: Lavras, MG"
                maxLength={80}
                className="h-14 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted/70"
              />
            </label>
            <BotaoLuz type="submit" disabled={carregando === "mais"} className="w-full text-base sm:w-auto sm:px-9">
              {garimpando ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
              {garimpando ? "Garimpando…" : "Garimpar"}
            </BotaoLuz>
          </div>
        </form>

        {erro && (
          <p
            role="alert"
            className="mx-auto mt-4 max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Resultado</p>
                <h2 className="mt-1 font-display text-3xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
                  <span className="texto-cromado">{busca.nicho}</span>{" "}
                  <span className="font-serif font-normal italic text-muted">em</span>{" "}
                  <span className="texto-cromado">{busca.cidade}</span>
                </h2>
              </div>
              {fonte === "osm" && (
                <p className="inline-flex max-w-sm items-start gap-1.5 text-xs text-amber sm:text-right">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Dados do OpenStreetMap: “sem site” pode ser só falta de cadastro. Confira no Google (ícone do mapa) antes de chamar.
                </p>
              )}
            </div>

            {/* números com holofote: 2×2 no celular, 4 colunas a partir de 640 px */}
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

            {/* filtros: no desktop grudam logo abaixo da pílula da navbar (76 px + folga) */}
            <div className="z-30 -mx-2 mt-8 flex flex-col gap-3 rounded-2xl px-2 py-2 lg:sticky lg:top-[5.25rem] lg:border lg:border-line lg:bg-ink/95">
              <div className="no-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
                {FILTROS.map((f) => (
                  <Chip key={f.id} ativo={filtro === f.id} onClick={() => setFiltro(f.id)}>
                    {f.label}
                  </Chip>
                ))}
                <Chip ativo={soTelefone} onClick={() => setSoTelefone((v) => !v)}>
                  <Phone className="size-4" /> Com telefone
                </Chip>
                <Chip ativo={esconderSalvos} onClick={() => setEsconderSalvos((v) => !v)}>
                  <BookmarkCheck className="size-4" /> Esconder salvos
                </Chip>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {buscaTodos && nichosAchados.length > 0 && (
                  <label className="vidro flex min-h-11 min-w-0 items-center gap-2 rounded-full px-4 text-sm">
                    <LayoutGrid className="size-4 shrink-0 text-muted" />
                    <span className="sr-only">Nicho</span>
                    <select
                      value={nichoFiltro}
                      onChange={(e) => setNichoFiltro(e.target.value)}
                      className="min-h-11 w-full min-w-0 bg-transparent outline-none [&>option]:bg-panel"
                    >
                      <option value="">Todos os nichos</option>
                      {nichosAchados.map(([nome, qtd]) => (
                        <option key={nome} value={nome}>
                          {nome} ({qtd})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="vidro flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-4 text-sm sm:flex-none">
                  <ArrowDownWideNarrow className="size-4 shrink-0 text-muted" />
                  <span className="sr-only">Ordenar por</span>
                  <select
                    value={ordem}
                    onChange={(e) => setOrdem(e.target.value as Ordem)}
                    className="min-h-11 w-full min-w-0 bg-transparent outline-none [&>option]:bg-panel"
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
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-colors ${
                    editandoMsg ? "border border-cream bg-cream font-semibold text-ink" : "vidro text-cream/80 hover:text-cream"
                  }`}
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
                nicho={busca.nicho}
                onSalvar={(t) => {
                  setModelo(t);
                  salvarModelo(t);
                  setEditandoMsg(false);
                }}
              />
            )}

            {/* resultados chegam ao vivo: a linha de progresso fica no topo da grade até terminar */}
            {parcial && (
              <div className="mt-6">
                <div aria-hidden className="relative h-px overflow-hidden rounded-full bg-line motion-reduce:bg-lime/40">
                  <div className="absolute inset-y-0 left-0 w-1/3 animate-varrer bg-gradient-to-r from-transparent via-lime to-transparent motion-reduce:hidden" />
                </div>
                <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin text-lime motion-reduce:animate-none" />
                  {progresso || "Buscando…"}
                </p>
              </div>
            )}

            {visiveis.length === 0 ? (
              mostrarVazio({ parcial, erro }) && (
                <p className="mt-10 rounded-3xl border border-dashed border-line p-10 text-center text-muted">
                  {empresas.length === 0 && fonte === "osm"
                    ? "O OpenStreetMap não tem esse nicho cadastrado nessa cidade. Tente outro nicho ou uma cidade maior por perto."
                    : "Nenhum resultado com esse filtro."}
                  {empresas.length > 0 && esconderSalvos && salvosNaBusca.size > 0 && " Os já salvos estão escondidos."}
                  {proxima && " Tente carregar mais resultados."}
                </p>
              )
            ) : (
              <div
                ref={topoResultados}
                className="mt-6 grid scroll-mt-28 gap-3 sm:grid-cols-2 lg:scroll-mt-56 lg:grid-cols-3"
              >
                {pagina.itens.map((e, i) => (
                  <EmpresaCard
                    key={e.placeId}
                    empresa={e}
                    cidade={busca.cidade}
                    nicho={nichoDe(e)}
                    modelo={modelo}
                    salvo={salvos.has(e.placeId)}
                    onSalvar={salvar}
                    indice={i}
                  />
                ))}
              </div>
            )}

            {pagina.totalPaginas > 1 && (
              <Paginacao atual={pagina.pagina} total={pagina.totalPaginas} quantidade={visiveis.length} irPara={irPara} />
            )}

            {proxima && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => carregarMais()}
                  disabled={carregando !== null}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cream px-6 py-3 text-sm font-semibold transition-colors hover:bg-cream hover:text-ink disabled:opacity-60"
                >
                  {carregando === "mais" && <Loader2 className="size-4 animate-spin" />}
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

function Paginacao({
  atual,
  total,
  quantidade,
  irPara,
}: {
  atual: number;
  total: number;
  quantidade: number;
  irPara: (n: number) => void;
}) {
  const botao =
    "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-cream/80 transition-colors hover:border-white/20 hover:text-cream disabled:pointer-events-none disabled:opacity-35";
  return (
    <nav aria-label="Páginas dos resultados" className="mt-8 flex items-center justify-center gap-2 sm:gap-3">
      <button type="button" className={botao} onClick={() => irPara(atual - 1)} disabled={atual <= 1}>
        <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Anterior</span>
      </button>
      <p className="min-w-0 px-1 text-center text-sm text-muted" aria-live="polite">
        Página <b className="font-semibold text-cream">{atual}</b> de {total}
        <span className="hidden sm:inline"> · {quantidade} resultados</span>
      </p>
      <button type="button" className={botao} onClick={() => irPara(atual + 1)} disabled={atual >= total}>
        <span className="hidden sm:inline">Próxima</span> <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

function Numero({ valor, label, cor = "text-cream" }: { valor: number; label: string; cor?: string }) {
  return (
    <SpotlightCard className="rounded-2xl border border-line bg-panel p-1.5">
      <div className="relative rounded-xl bg-panel-2/70 px-4 py-3">
        <Contador valor={valor} className={`block font-display text-3xl font-bold tracking-tight sm:text-4xl ${cor}`} />
        <p className="text-xs text-muted">{label}</p>
      </div>
    </SpotlightCard>
  );
}

function EditorMensagem({
  modelo,
  exemplo,
  cidade,
  nicho,
  onSalvar,
}: {
  modelo: string;
  exemplo: string;
  cidade: string;
  nicho: string;
  onSalvar: (t: string) => void;
}) {
  const [texto, setTexto] = useState(modelo);
  return (
    <div className="mt-4 grid gap-2 rounded-3xl border border-line bg-panel p-2 md:grid-cols-2">
      <div className="rounded-2xl bg-panel-2 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Modelo · use {"{nome}"}, {"{cidade}"} e {"{nicho}"}
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          aria-label="Modelo da mensagem"
          className="mt-2 w-full resize-y rounded-xl border border-line bg-ink p-3 text-base outline-none focus:border-lime/60 sm:text-sm"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSalvar(texto)}
            className="min-h-11 rounded-full bg-lime px-5 text-sm font-bold text-ink"
          >
            Salvar modelo
          </button>
          <button
            type="button"
            onClick={() => setTexto(MENSAGEM_PADRAO)}
            className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-cream"
          >
            Voltar ao padrão
          </button>
        </div>
      </div>
      <div className="rounded-2xl bg-[#0b141a] p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Como chega no WhatsApp</p>
        <p className="ml-auto mt-3 max-w-md whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-sm leading-relaxed text-white [overflow-wrap:anywhere]">
          {montarMensagem(texto, { nome: exemplo, cidade, nicho })}
        </p>
      </div>
    </div>
  );
}

const PASSOS: { n: string; t: string; d: string; icon: LucideIcon }[] = [
  { n: "01", t: "Escolha o nicho", d: "Barbearia, dentista, pet shop… ou digite qualquer outro.", icon: Target },
  {
    n: "02",
    t: "Veja quem está sem site",
    d: "Separamos sem site, só Instagram e quem já tem site. Qualquer cidade do Brasil.",
    icon: ScanSearch,
  },
  { n: "03", t: "Chame no WhatsApp", d: "Mensagem pronta com o nome do negócio. Salve como lead.", icon: MessageCircle },
];

function Vazio() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {PASSOS.map((p) => (
        <SpotlightCard key={p.n} className="rounded-3xl border border-line bg-panel p-2">
          <div className="relative h-full rounded-2xl bg-panel-2/70 p-6">
            <div className="flex items-center justify-between">
              <PastilhaCromada icon={p.icon} />
              <span className="font-mono text-xs text-lime">{p.n}</span>
            </div>
            <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">{p.t}</h3>
            <p className="mt-2 text-sm text-muted">{p.d}</p>
          </div>
        </SpotlightCard>
      ))}
      <p className="flex items-center justify-center gap-2 pt-4 text-sm text-muted md:col-span-3">
        <Pickaxe className="size-4" /> Nenhuma busca ainda.
      </p>
    </div>
  );
}
