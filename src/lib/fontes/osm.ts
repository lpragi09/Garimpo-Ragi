import type { BuscaResposta, Empresa } from "../types";
import { classificarSite, linkGoogleMaps } from "./site";
import { FonteErro } from "./erro";
import { criarRitmo } from "./ritmo";
import { combinarSinais } from "../http";
import { TODOS, nichoPorId } from "../nichos";

// OpenStreetMap: grátis, sem chave e sem cartão.
// 1. Photon (komoot) acha a cidade e o retângulo dela.
// 2. Nominatim lista os estabelecimentos com "[chave=valor]" dentro desse retângulo,
//    já com telefone e site (extratags). Uma consulta leve por página de 40.
//
// O Overpass foi abandonado: os servidores públicos vivem fora do ar ou bloqueando IP.
// Política do Nominatim: no máx. 1 req/s e identificação do app
// (https://operations.osmfoundation.org/policies/nominatim/). No navegador o Referer
// identifica; no servidor vai o User-Agent.
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";
const NO_SERVIDOR = typeof window === "undefined";
const CABECALHOS: HeadersInit = NO_SERVIDOR ? { "User-Agent": "Garimpo/1.0 (+https://garimpo-ragi.vercel.app)" } : {};

const POR_PAGINA = 40; // máximo do Nominatim
const MAX_PAGINAS = 4; // por etiqueta: até 160 resultados
// Etiquetas genéricas que depois passam pelo filtro de nome (`manter`): a maior parte dos
// resultados é descartada, então páginas extras custam caro e rendem pouco.
const GENERICAS = new Set(["[shop=hairdresser]", "[shop=beauty]"]);
const MAX_PAGINAS_GENERICA = 2;
// "Todos": cada etiqueta uma vez, até 2 páginas (~25 etiquetas ≈ 1 min a 1 req/s).
const MAX_PAGINAS_TODOS = 2;
// A lista de exclusão vai na URL: só os ids mais recentes, pra não estourar o tamanho.
const MAX_EXCLUIR = 150;

// 1 req/s medido entre os INÍCIOS das requisições (política do Nominatim). Fica no módulo
// pra valer também entre buscas seguidas (uma cancelada e outra logo em seguida).
const ritmoNominatim = criarRitmo(1100);

type Tags = Record<string, string>;
// Cada consulta é um "q" do Nominatim: "[chave=valor]" busca pela etiqueta, texto solto busca pelo nome.
type FiltroNicho = { consultas: string[]; manter?: (nome: string, t: Tags) => boolean };

const etiquetas = (...t: string[]) => t.map((x) => `[${x}]`);

// Nicho → etiquetas do OSM (https://wiki.openstreetmap.org/wiki/Map_features)
const FILTROS: Record<string, FiltroNicho> = {
  // em cidade grande as barbearias somem no meio de milhares de salões: busca pelo nome também
  barbearia: {
    consultas: ["barbearia", "barber", ...etiquetas("shop=barber", "shop=hairdresser")],
    manter: (nome, t) => Boolean(t.hairdresser?.includes("barber")) || /barb/i.test(nome),
  },
  salao: { consultas: etiquetas("shop=hairdresser", "shop=beauty"), manter: (nome) => !/barb/i.test(nome) },
  estetica: {
    consultas: etiquetas("shop=beauty", "shop=cosmetics"),
    manter: (nome) => /est[eé]tica|beleza|spa|depila|sobrancelha|unha|nail|esmalt|beauty|lash|c[ií]lio/i.test(nome),
  },
  dentista: { consultas: etiquetas("amenity=dentist") },
  clinica: { consultas: etiquetas("amenity=clinic", "amenity=doctors") },
  petshop: { consultas: etiquetas("shop=pet", "amenity=veterinary") },
  academia: { consultas: etiquetas("leisure=fitness_centre") },
  restaurante: { consultas: etiquetas("amenity=restaurant") },
  padaria: { consultas: etiquetas("shop=bakery", "shop=pastry") },
  oficina: { consultas: etiquetas("shop=car_repair", "shop=motorcycle_repair", "shop=tyres") },
  advocacia: { consultas: etiquetas("office=lawyer") },
  contabilidade: { consultas: etiquetas("office=accountant", "office=tax_advisor") },
  imobiliaria: { consultas: etiquetas("office=estate_agent") },
  construcao: { consultas: etiquetas("shop=hardware", "shop=doityourself") },
  fotografo: { consultas: etiquetas("craft=photographer", "shop=photo") },
};

// Categorias do Nominatim que são estabelecimento (rua, bairro, rio… ficam de fora)
const NEGOCIO = new Set(["shop", "amenity", "office", "craft", "leisure", "healthcare", "tourism"]);

export type Progresso = (mensagem: string) => void;

export type OpcoesBusca = {
  progresso?: Progresso;
  // recebe a lista acumulada (cópia) depois de cada página: dá pra mostrar ao vivo
  onParcial?: (empresas: Empresa[]) => void;
  sinal?: AbortSignal;
};

async function pegarJson<T>(url: string, sinal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: CABECALHOS, signal: combinarSinais(sinal, AbortSignal.timeout(20_000)) });
  } catch (e) {
    // TypeError = rede/CORS bloqueado; deixa quem chamou tentar pelo servidor
    throw e instanceof TypeError ? new SemAcesso() : e;
  }
  if (res.status === 429 || res.status === 403) throw new SemAcesso();
  if (!res.ok) throw new FonteErro("O mapa não respondeu agora. Tente de novo em instantes.");
  return res.json() as Promise<T>;
}

// O navegador não conseguiu falar com o mapa (bloqueio/limite): dá pra tentar pelo servidor.
export class SemAcesso extends FonteErro {
  constructor() {
    super("O mapa limitou as consultas. Tente de novo em 1 minuto.", 503);
  }
}

// Chave de deduplicação: telefone identifica melhor, mas sem ele dois negócios diferentes
// com o mesmo nome (comum em rede/franquia) não podem colidir — por isso cai no placeId.
export function chaveEmpresa(e: Empresa): string {
  return e.telefone ? `${e.nome.toLowerCase()}|${e.telefone}` : e.placeId;
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

type Cidade = { nome: string; viewbox: string; tipo: string };

type Photon = {
  features: {
    properties: { name: string; osm_type: string; type: string; countrycode?: string; extent?: number[] };
  }[];
};

async function acharCidade(cidade: string, sinal?: AbortSignal): Promise<Cidade> {
  const j = await pegarJson<Photon>(`${PHOTON}?${new URLSearchParams({ q: cidade, limit: "8" })}`, sinal);
  const br = j.features.map((f) => f.properties).filter((p) => p.countrycode === "BR" && p.extent?.length === 4);
  const achada =
    br.find((p) => p.osm_type === "R" && ["city", "town", "village"].includes(p.type)) ??
    br.find((p) => ["city", "town", "village", "district"].includes(p.type));
  if (!achada?.extent) throw new FonteErro(`Não achei a cidade "${cidade}". Tente "Cidade, UF" — ex.: Lavras, MG.`, 404);
  // Photon: [minLon, maxLat, maxLon, minLat]; Nominatim viewbox: esquerda,cima,direita,baixo
  const [w, n, e, s] = achada.extent;
  return { nome: achada.name, viewbox: `${w},${n},${e},${s}`, tipo: achada.type };
}

type Lugar = {
  place_id: number;
  category: string;
  osm_type: string;
  osm_id: number;
  name: string;
  extratags?: Tags | null;
  address?: Record<string, string>;
};

async function paginaNominatim(q: string, viewbox: string, excluir: number[], sinal?: AbortSignal): Promise<Lugar[]> {
  const params = new URLSearchParams({
    q,
    viewbox,
    bounded: "1",
    countrycodes: "br",
    format: "jsonv2",
    extratags: "1",
    addressdetails: "1",
    limit: String(POR_PAGINA),
  });
  if (excluir.length) params.set("exclude_place_ids", excluir.join(","));
  return pegarJson<Lugar[]>(`${NOMINATIM}?${params}`, sinal);
}

function primeiroTelefone(t: Tags) {
  const bruto = t["contact:mobile"] || t["contact:whatsapp"] || t.phone || t["contact:phone"] || t.mobile;
  return bruto?.split(/[;,/]/)[0].trim() || null;
}

function siteOuRede(t: Tags) {
  const site = t.website || t["contact:website"] || t.url;
  if (site) return site.startsWith("http") ? site : `https://${site}`;
  const insta = t["contact:instagram"] || t.instagram;
  if (insta) return insta.startsWith("http") ? insta : `https://instagram.com/${insta.replace(/^@/, "")}`;
  const face = t["contact:facebook"] || t.facebook;
  if (face) return face.startsWith("http") ? face : `https://facebook.com/${face}`;
  return null;
}

function normalizar(l: Lugar, cidade: string, categoria: string): Empresa {
  const t = l.extratags ?? {};
  const a = l.address ?? {};
  const site = siteOuRede(t);
  const rua = [a.road, a.house_number].filter(Boolean).join(", ");
  const local = a.city || a.town || a.village || a.municipality;
  const endereco = [rua, a.suburb, local].filter(Boolean).join(" - ") || null;
  return {
    placeId: `osm-${l.osm_type}-${l.osm_id}`,
    nome: l.name,
    categoria,
    endereco,
    telefone: primeiroTelefone(t),
    site,
    presenca: classificarSite(site),
    nota: null,
    avaliacoes: 0,
    mapsUrl: linkGoogleMaps(l.name, cidade),
    aberta: true,
  };
}

export async function buscarOsm(
  nichoId: string,
  termo: string,
  cidade: string,
  categoria: string,
  opcoes: OpcoesBusca = {},
): Promise<BuscaResposta> {
  const { progresso, onParcial, sinal } = opcoes;
  sinal?.throwIfAborted();
  progresso?.("Localizando a cidade…");
  const alvo = await acharCidade(cidade, sinal);
  const nomeCidade = semAcento(alvo.nome);

  const plano = nichoId === TODOS ? planoTodos() : planoNicho(nichoId, termo, categoria);

  const vistos = new Set<string>();
  const empresas: Empresa[] = [];
  // num nicho só, compartilhada entre as consultas: o que "barbearia" já trouxe não volta em
  // "[shop=barber]". No "Todos" cada etiqueta é de um nicho diferente, então recomeça a cada uma.
  let excluir: number[] = [];

  for (const passo of plano.passos) {
    if (!plano.excluirCompartilhado) excluir = [];
    for (let pagina = 0; pagina < passo.maxPaginas; pagina++) {
      sinal?.throwIfAborted();
      await ritmoNominatim();
      sinal?.throwIfAborted();
      progresso?.(empresas.length ? `Buscando… ${empresas.length} encontrados até agora` : "Buscando no mapa…");

      const lugares = await paginaNominatim(passo.q, alvo.viewbox, excluir, sinal);
      excluir = [...excluir, ...lugares.map((l) => l.place_id)].slice(-MAX_EXCLUIR);
      for (const l of lugares) {
        // busca por texto também acha rua e bairro com o mesmo nome: só negócio passa
        if (!l.name || !NEGOCIO.has(l.category)) continue;
        // o retângulo da cidade pega um pedaço das vizinhas: fica só quem é da cidade
        // (quando a cidade buscada é um "district", o próprio Nominatim já devolve o endereço do distrito)
        const local = l.address?.city || l.address?.town || l.address?.village || l.address?.municipality;
        if (local && alvo.tipo !== "district" && semAcento(local) !== nomeCidade) continue;
        // a primeira categoria cujo filtro de nome aceita o lugar fica com ele
        const dono = passo.categorias.find((c) => !c.manter || c.manter(l.name, l.extratags ?? {}));
        if (!dono) continue;
        const e = normalizar(l, cidade, dono.categoria);
        const chave = chaveEmpresa(e);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        empresas.push(e);
      }
      onParcial?.([...empresas]);
      if (lugares.length < POR_PAGINA) break;
    }
  }

  return { empresas, proximaPagina: null, fonte: "osm" };
}

// ---------- Plano de consultas ----------

type CategoriaAlvo = { categoria: string; manter?: FiltroNicho["manter"] };
type Passo = { q: string; maxPaginas: number; categorias: CategoriaAlvo[] };
type Plano = { passos: Passo[]; excluirCompartilhado: boolean };

// Um nicho: as consultas dele, todas com a mesma categoria.
function planoNicho(nichoId: string, termo: string, categoria: string): Plano {
  const filtro = FILTROS[nichoId];
  // "Outro": busca pelo texto, que o Nominatim casa com o nome
  const consultas = filtro?.consultas ?? [termo];
  return {
    excluirCompartilhado: true,
    passos: consultas.map((q) => ({
      q,
      maxPaginas: filtro?.manter && GENERICAS.has(q) ? MAX_PAGINAS_GENERICA : MAX_PAGINAS,
      categorias: [{ categoria, manter: filtro?.manter }],
    })),
  };
}

// Nichos que aceitam quase tudo da etiqueta (salão = "não é barbearia") ficam por último,
// pra não roubar o que é de um nicho mais específico (barbearia, estética).
const PEGA_TUDO = new Set(["salao"]);

// "Todos": cada etiqueta do mapa uma vez só (sem as buscas por texto), e cada lugar vai pro
// primeiro nicho daquela etiqueta que aceita o nome dele.
function planoTodos(): Plano {
  const porEtiqueta = new Map<string, { id: string; filtro: FiltroNicho }[]>();
  for (const [id, filtro] of Object.entries(FILTROS)) {
    for (const q of filtro.consultas) {
      if (!q.startsWith("[")) continue;
      porEtiqueta.set(q, [...(porEtiqueta.get(q) ?? []), { id, filtro }]);
    }
  }
  return {
    excluirCompartilhado: false,
    passos: [...porEtiqueta].map(([q, nichos]) => ({
      q,
      maxPaginas: MAX_PAGINAS_TODOS,
      categorias: [...nichos]
        .sort((a, b) => Number(PEGA_TUDO.has(a.id)) - Number(PEGA_TUDO.has(b.id)))
        .map(({ id, filtro }) => ({ categoria: nichoPorId(id)?.label ?? id, manter: filtro.manter })),
    })),
  };
}
