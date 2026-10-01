import type { BuscaResposta, Empresa } from "../types";
import { classificarSite, linkGoogleMaps } from "./site";
import { FonteErro } from "./erro";

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

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pegarJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: CABECALHOS, signal: AbortSignal.timeout(20_000) });
  } catch (e) {
    // TypeError = rede/CORS bloqueado; deixa quem chamou tentar pelo servidor
    throw e instanceof TypeError ? new SemAcesso() : e;
  }
  if (res.status === 429 || res.status === 403) throw new SemAcesso();
  if (!res.ok) throw new FonteErro("O mapa não respondeu agora. Tente de novo em instantes.");
  return res.json() as Promise<T>;
}

// O navegador não conseguiu falar com o mapa (bloqueio/limite): dá pra tentar pelo servidor.
export class SemAcesso extends Error {
  constructor() {
    super("Sem acesso ao mapa a partir daqui.");
  }
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

type Cidade = { nome: string; viewbox: string };

type Photon = {
  features: {
    properties: { name: string; osm_type: string; type: string; countrycode?: string; extent?: number[] };
  }[];
};

async function acharCidade(cidade: string): Promise<Cidade> {
  const j = await pegarJson<Photon>(`${PHOTON}?${new URLSearchParams({ q: cidade, limit: "8" })}`);
  const br = j.features.map((f) => f.properties).filter((p) => p.countrycode === "BR" && p.extent?.length === 4);
  const achada =
    br.find((p) => p.osm_type === "R" && ["city", "town", "village"].includes(p.type)) ??
    br.find((p) => ["city", "town", "village", "district"].includes(p.type));
  if (!achada?.extent) throw new FonteErro(`Não achei a cidade "${cidade}". Tente "Cidade, UF" — ex.: Lavras, MG.`, 404);
  // Photon: [minLon, maxLat, maxLon, minLat]; Nominatim viewbox: esquerda,cima,direita,baixo
  const [w, n, e, s] = achada.extent;
  return { nome: achada.name, viewbox: `${w},${n},${e},${s}` };
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

async function paginaNominatim(q: string, viewbox: string, excluir: number[]): Promise<Lugar[]> {
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
  return pegarJson<Lugar[]>(`${NOMINATIM}?${params}`);
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
  progresso?: Progresso,
): Promise<BuscaResposta> {
  progresso?.("Localizando a cidade…");
  const alvo = await acharCidade(cidade);
  const nomeCidade = semAcento(alvo.nome);

  const filtro = FILTROS[nichoId];
  // "Outro": busca pelo texto, que o Nominatim casa com o nome
  const consultas = filtro?.consultas ?? [termo];

  const vistos = new Set<string>();
  const empresas: Empresa[] = [];
  let primeira = true;

  for (const q of consultas) {
    const excluir: number[] = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      if (!primeira) await espera(1100); // 1 req/s, como o Nominatim pede
      primeira = false;
      progresso?.(empresas.length ? `Buscando… ${empresas.length} encontrados até agora` : "Buscando no mapa…");

      const lugares = await paginaNominatim(q, alvo.viewbox, excluir);
      for (const l of lugares) {
        excluir.push(l.place_id);
        // busca por texto também acha rua e bairro com o mesmo nome: só negócio passa
        if (!l.name || !NEGOCIO.has(l.category)) continue;
        // o retângulo da cidade pega um pedaço das vizinhas: fica só quem é da cidade
        const local = l.address?.city || l.address?.town || l.address?.village || l.address?.municipality;
        if (local && semAcento(local) !== nomeCidade) continue;
        if (filtro?.manter && !filtro.manter(l.name, l.extratags ?? {})) continue;
        const e = normalizar(l, cidade, categoria);
        const chave = `${e.nome.toLowerCase()}|${e.telefone ?? ""}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        empresas.push(e);
      }
      if (lugares.length < POR_PAGINA) break;
    }
  }

  return { empresas, proximaPagina: null, fonte: "osm" };
}
